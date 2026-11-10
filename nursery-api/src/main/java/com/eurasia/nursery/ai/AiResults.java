package com.eurasia.nursery.ai;

import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class AiResults {
    public static final int MAX_ITEMS = 40;
    public static final int MAX_CHARS = 12000;

    private AiResults() {
    }

    public static UserView elevated(UserView caller) {
        UserView actor = new UserView();
        if (caller != null) {
            actor.setId(caller.getId());
            actor.setUsername(caller.getUsername());
            actor.setDisplayName(caller.getDisplayName());
            actor.setPhone(caller.getPhone());
            actor.setStatus(caller.getStatus());
            actor.setRoleId(caller.getRoleId());
        }
        actor.setRoleCode("ADMIN");
        actor.setRoleName("系统管理员");
        actor.setExtraPageAccess("[]");
        return actor;
    }

    public static Map<String, Object> error(String message) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", false);
        out.put("error", message);
        return out;
    }

    public static Map<String, Object> unknownAction(String... actions) {
        return error("未知 action，可选：" + String.join("、", actions));
    }

    public static Map<String, Object> deleted(long id) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("deletedId", id);
        return out;
    }

    public static Map<String, Object> listed(List<?> rows) {
        List<?> source = rows == null ? List.of() : rows;
        int total = source.size();
        List<?> slice = total > MAX_ITEMS ? source.subList(0, MAX_ITEMS) : source;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", total);
        out.put("returned", slice.size());
        out.put("items", slice);
        if (total > slice.size()) {
            out.put("truncated", true);
        }
        return out;
    }

    public static boolean isFailure(Object result) {
        if (result instanceof Map<?, ?> map) {
            Object ok = map.get("ok");
            return Boolean.FALSE.equals(ok);
        }
        return false;
    }

    public static Object sanitize(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                if (secretKey(key)) {
                    continue;
                }
                out.put(key, sanitize(entry.getValue()));
            }
            return out;
        }
        if (value instanceof List<?> list) {
            List<Object> out = new ArrayList<>();
            for (Object item : list) {
                out.add(sanitize(item));
            }
            return out;
        }
        return value;
    }

    public static String writeJson(ObjectMapper mapper, Object value) {
        Object safe = sanitize(value);
        try {
            String text = mapper.writeValueAsString(safe);
            if (text.length() <= MAX_CHARS) {
                return text;
            }
            Map<String, Object> wrapped = new LinkedHashMap<>();
            wrapped.put("truncated", true);
            wrapped.put("preview", text.substring(0, MAX_CHARS));
            return mapper.writeValueAsString(wrapped);
        } catch (JsonProcessingException e) {
            return "{\"ok\":false,\"error\":\"结果无法序列化\"}";
        }
    }

    static boolean secretKey(String key) {
        String normalized = key.replace("_", "").replace("-", "").toLowerCase(Locale.ROOT);
        return normalized.contains("password")
                || normalized.contains("secret")
                || normalized.contains("apikey")
                || normalized.contains("accesstoken")
                || normalized.contains("refreshtoken")
                || normalized.equals("token")
                || normalized.equals("authorization")
                || normalized.equals("credential")
                || normalized.equals("credentials");
    }
}
