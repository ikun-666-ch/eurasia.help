package com.eurasia.nursery.ai;

import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/** 一次对话轮次里，工具和模型请求共享的取消标记与进度回调。 */
public final class AiCallScope {

    public record Context(Long conversationId, String latestUserMessage, Consumer<String> status, BooleanSupplier cancelled) {
    }

    private static final ThreadLocal<Context> CURRENT = new ThreadLocal<>();

    private AiCallScope() {
    }

    public static void set(Context context) {
        CURRENT.set(context);
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static Context get() {
        return CURRENT.get();
    }

    public static boolean cancelled() {
        Context context = CURRENT.get();
        return context != null && context.cancelled() != null && context.cancelled().getAsBoolean();
    }

    public static void status(String label) {
        Context context = CURRENT.get();
        if (context != null && context.status() != null && label != null && !label.isBlank()) {
            context.status().accept(label);
        }
    }

    public static String latestUserMessage() {
        Context context = CURRENT.get();
        return context == null || context.latestUserMessage() == null ? "" : context.latestUserMessage();
    }

    public static Long conversationId() {
        Context context = CURRENT.get();
        return context == null ? null : context.conversationId();
    }
}
