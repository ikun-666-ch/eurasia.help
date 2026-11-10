package com.eurasia.nursery.ai;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 敏感写入先挂起。同一条用户消息里不能自己确认自己；
 * 只有下一条明确的「确认」才会放行同一次操作。
 */
@Component
public class AiConfirmationService {

    private record Pending(String fingerprint, Instant expires) {
    }

    private final ConcurrentHashMap<Long, Pending> pending = new ConcurrentHashMap<>();

    public String blockOrProceed(long userId, String tool, String action, String summary, String latestUserMessage) {
        String fingerprint = tool + "\n" + action + "\n" + summary;
        Pending existing = pending.get(userId);
        if (existing != null
                && existing.fingerprint.equals(fingerprint)
                && existing.expires.isAfter(Instant.now())
                && isConfirmation(latestUserMessage)) {
            pending.remove(userId);
            return null;
        }
        pending.put(userId, new Pending(fingerprint, Instant.now().plusSeconds(600)));
        return summary + " 这是敏感操作，尚未执行。请用户在下一条消息只回复「确认」。";
    }

    public static boolean isConfirmation(String message) {
        if (message == null) {
            return false;
        }
        String text = message.trim().toLowerCase(Locale.ROOT).replaceAll("[。！!\\s]", "");
        if (text.isEmpty() || text.length() > 24) {
            return false;
        }
        return text.matches("^(确认|确定|同意|可以执行|执行吧|继续执行|yes|ok|okay|好的确认|我确认)$")
                || text.matches("^确认(删除|修改|执行|变更|清空|继续).{0,8}$");
    }
}
