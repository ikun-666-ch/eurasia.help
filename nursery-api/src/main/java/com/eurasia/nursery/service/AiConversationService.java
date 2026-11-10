package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.mapper.AiConversationMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiConversationService {

    static final String DEFAULT_TITLE = "新对话";
    static final int TITLE_LIMIT = 24;
    static final int MODEL_HISTORY = 20;

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AiConversationMapper mapper;
    private final ObjectMapper objectMapper;

    public AiConversationService(AiConversationMapper mapper, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> list(long userId, String query, boolean archived) {
        String q = query == null ? "" : query.trim();
        return mapper.search(userId, q, archived ? 1 : 0).stream().map(this::summary).toList();
    }

    public Map<String, Object> get(long userId, long id) {
        Map<String, Object> conversation = requireRaw(userId, id);
        Map<String, Object> out = summary(conversation);
        List<Map<String, Object>> messages = new ArrayList<>();
        for (Map<String, Object> row : mapper.listMessages(id)) {
            messages.add(messageView(row));
        }
        out.put("messages", messages);
        return out;
    }

    public void delete(long userId, long id) {
        requireRaw(userId, id);
        mapper.deleteMessages(id);
        mapper.deleteOwned(id, userId);
    }

    public Map<String, Object> setArchived(long userId, long id, boolean archived) {
        requireRaw(userId, id);
        mapper.updateArchived(id, userId, archived ? 1 : 0);
        return summary(requireRaw(userId, id));
    }

    public Map<String, Object> rename(long userId, long id, String title) {
        requireRaw(userId, id);
        String next = title == null ? "" : title.trim();
        if (next.isEmpty()) {
            throw new BusinessException("标题不能为空");
        }
        if (next.length() > 128) {
            next = next.substring(0, 128);
        }
        mapper.updateTitle(id, userId, next);
        return summary(requireRaw(userId, id));
    }

    public List<Map<String, String>> historyForModel(long userId, long conversationId) {
        requireRaw(userId, conversationId);
        List<Map<String, String>> all = new ArrayList<>();
        for (Map<String, Object> row : mapper.listMessages(conversationId)) {
            String role = String.valueOf(row.get("role"));
            if (!"user".equals(role) && !"assistant".equals(role)) {
                continue;
            }
            String content = row.get("content") == null ? "" : String.valueOf(row.get("content")).trim();
            if (content.isEmpty()) {
                continue;
            }
            all.add(Map.of("role", role, "content", content));
        }
        if (all.size() <= MODEL_HISTORY) {
            return all;
        }
        return new ArrayList<>(all.subList(all.size() - MODEL_HISTORY, all.size()));
    }

    @Transactional
    public Map<String, Object> saveExchange(long userId, Long conversationId, String userText, String assistantText,
                                            List<Map<String, Object>> toolTrace) {
        long id;
        if (conversationId == null) {
            mapper.insert(userId, titleFrom(userText));
            Long created = mapper.lastInsertId();
            if (created == null || created <= 0) {
                throw new BusinessException("创建对话失败", 500);
            }
            id = created;
        } else {
            Map<String, Object> existing = requireRaw(userId, conversationId);
            id = conversationId;
            String title = existing.get("title") == null ? "" : String.valueOf(existing.get("title")).trim();
            if (title.isEmpty() || DEFAULT_TITLE.equals(title)) {
                mapper.updateTitle(id, userId, titleFrom(userText));
            }
        }
        mapper.insertMessage(id, "user", userText, null);
        mapper.insertMessage(id, "assistant", assistantText, traceJson(toolTrace));
        mapper.touch(id, userId);
        return summary(requireRaw(userId, id));
    }

    static String titleFrom(String message) {
        String oneLine = message == null ? "" : message.replaceAll("\\s+", " ").trim();
        if (oneLine.isEmpty()) {
            return DEFAULT_TITLE;
        }
        if (oneLine.length() > TITLE_LIMIT) {
            return oneLine.substring(0, TITLE_LIMIT) + "…";
        }
        return oneLine;
    }

    private Map<String, Object> requireRaw(long userId, long id) {
        Map<String, Object> row = mapper.findOwned(id, userId);
        if (row == null || row.isEmpty()) {
            throw new BusinessException("对话不存在");
        }
        return row;
    }

    private Map<String, Object> summary(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", longVal(row.get("id")));
        out.put("title", row.get("title") == null ? DEFAULT_TITLE : String.valueOf(row.get("title")));
        out.put("archived", truthy(row.get("archived")));
        out.put("createdAt", formatTime(row.get("createdAt")));
        out.put("updatedAt", formatTime(row.get("updatedAt")));
        return out;
    }

    private Map<String, Object> messageView(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", longVal(row.get("id")));
        out.put("role", row.get("role"));
        out.put("content", row.get("content") == null ? "" : String.valueOf(row.get("content")));
        out.put("toolTrace", parseTrace(row.get("toolTrace")));
        out.put("createdAt", formatTime(row.get("createdAt")));
        return out;
    }

    private List<Map<String, Object>> parseTrace(Object raw) {
        if (raw == null || String.valueOf(raw).isBlank()) {
            return List.of();
        }
        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(String.valueOf(raw), new TypeReference<>() {});
            return parsed == null ? List.of() : parsed;
        } catch (Exception e) {
            return List.of();
        }
    }

    private String traceJson(List<Map<String, Object>> toolTrace) {
        if (toolTrace == null || toolTrace.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(toolTrace);
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean truthy(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return "1".equals(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value));
    }

    private static long longVal(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }

    private static String formatTime(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof LocalDateTime time) {
            return time.format(TIME);
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime().format(TIME);
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant().atZone(java.time.ZoneId.of("Asia/Shanghai")).toLocalDateTime().format(TIME);
        }
        return String.valueOf(value).replace('T', ' ');
    }
}
