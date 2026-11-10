package com.eurasia.nursery.ai;

import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eurasia.nursery.mapper.AiAuditMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

/** 写入统一包一层：敏感操作确认、审计，以及给模型看的变更说明。 */
@Service
public class AiWrites {

    private final AiConfirmationService confirmations;
    private final AiAuditMapper auditMapper;
    private final ObjectMapper objectMapper;

    public AiWrites(AiConfirmationService confirmations, AiAuditMapper auditMapper, ObjectMapper objectMapper) {
        this.confirmations = confirmations;
        this.auditMapper = auditMapper;
        this.objectMapper = objectMapper;
    }

    public Object run(UserView user, String tool, String action, String summary, Object before,
                      boolean sensitive, boolean reversible, Supplier<Object> write) {
        if (sensitive) {
            String blocked = confirmations.blockOrProceed(user.getId(), tool, action, summary, AiCallScope.latestUserMessage());
            if (blocked != null) {
                Map<String, Object> pending = new LinkedHashMap<>();
                pending.put("ok", false);
                pending.put("needsConfirmation", true);
                pending.put("summary", blocked);
                return pending;
            }
        }
        Object after = write.get();
        long auditId = record(user.getId(), AiCallScope.conversationId(), tool, action, summary, before, after, reversible);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("summary", summary);
        out.put("before", before);
        out.put("after", after);
        out.put("auditId", auditId);
        out.put("reversible", reversible);
        return out;
    }

    @Transactional
    public long record(long userId, Long conversationId, String tool, String action, String summary,
                       Object before, Object after, boolean reversible) {
        String text = summary == null ? "" : summary;
        if (text.length() > 500) {
            text = text.substring(0, 500);
        }
        auditMapper.insert(userId, conversationId, tool, action, text, json(before), json(after), reversible ? 1 : 0);
        Long id = auditMapper.lastInsertId();
        return id == null ? 0 : id;
    }

    private String json(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(AiResults.sanitize(value));
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
