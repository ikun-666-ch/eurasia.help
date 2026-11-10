package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class AiAgentLoop {

    public static final int MAX_ROUNDS = 8;

    private final ObjectMapper objectMapper;
    private final NurseryProperties properties;

    public AiAgentLoop(ObjectMapper objectMapper, NurseryProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public Result run(ArrayNode messages, List<AiTool> tools, UserView caller, AiToolExecutor executor, ChatCompletionClient client) {
        try {
            return runLoop(messages, tools, caller, executor, client);
        } catch (AgentReplyException e) {
            return new Result(e.reply, e.trace);
        }
    }

    private Result runLoop(ArrayNode messages, List<AiTool> tools, UserView caller, AiToolExecutor executor, ChatCompletionClient client) {
        List<ToolTrace> trace = new ArrayList<>();
        boolean executedTool = false;
        for (int round = 0; round < MAX_ROUNDS; round++) {
            JsonNode data = request(messages, tools, client, executedTool, trace);
            JsonNode message = data.path("choices").path(0).path("message");
            JsonNode toolCalls = message.path("tool_calls");
            if (!toolCalls.isArray() || toolCalls.isEmpty()) {
                return new Result(textOrFallback(message.path("content").asText(""), trace), trace);
            }
            messages.add(assistantMessage(message));
            int index = 0;
            for (JsonNode call : toolCalls) {
                String id = call.path("id").asText("");
                if (id.isBlank()) {
                    id = "call_" + round + "_" + index;
                }
                if (AiCallScope.cancelled()) {
                    return new Result("已停止。", trace);
                }
                String name = call.path("function").path("name").asText("");
                AiToolExecutor.Execution execution;
                try {
                    execution = executor.execute(name, argumentsOf(call), caller);
                } catch (AiCancelledException cancelled) {
                    return new Result("已停止。", trace);
                }
                trace.add(new ToolTrace(execution.name(), execution.label(), execution.ok()));
                ObjectNode toolMessage = objectMapper.createObjectNode();
                toolMessage.put("role", "tool");
                toolMessage.put("tool_call_id", id);
                toolMessage.put("content", execution.content());
                messages.add(toolMessage);
                executedTool = true;
                index++;
            }
        }
        JsonNode data = request(messages, List.of(), client, true, trace);
        String content = data.path("choices").path(0).path("message").path("content").asText("");
        return new Result(textOrFallback(content, trace), trace);
    }

    private JsonNode request(ArrayNode messages, List<AiTool> tools, ChatCompletionClient client, boolean executedTool,
                             List<ToolTrace> trace) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", properties.getDeepseek().getModel());
        payload.set("messages", messages);
        payload.put("stream", false);
        payload.put("temperature", 0.2);
        payload.put("max_tokens", 2048);
        if (tools != null && !tools.isEmpty()) {
            payload.set("tools", toolSchema(tools));
            payload.put("tool_choice", "auto");
        }
        try {
            return client.complete(payload);
        } catch (BusinessException e) {
            if (e.getMessage() != null && e.getMessage().contains("已停止")) {
                throw new AgentReplyException("已停止。", trace);
            }
            if (!executedTool && isToolUnsupported(e)) {
                throw new AiToolsUnsupportedException(e);
            }
            if (executedTool) {
                throw new AgentReplyException(textOrFallback("", trace) + " 后续说明失败：" + e.getMessage(), trace);
            }
            throw e;
        }
    }

    private ObjectNode assistantMessage(JsonNode message) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("role", "assistant");
        JsonNode content = message.get("content");
        if (content == null || content.isNull()) {
            node.putNull("content");
        } else {
            node.set("content", content.deepCopy());
        }
        if (message.hasNonNull("tool_calls")) {
            node.set("tool_calls", message.get("tool_calls").deepCopy());
        }
        return node;
    }

    private ArrayNode toolSchema(List<AiTool> tools) {
        ArrayNode array = objectMapper.createArrayNode();
        for (AiTool tool : tools) {
            ObjectNode function = objectMapper.createObjectNode();
            function.put("name", tool.name());
            function.put("description", tool.description());
            function.set("parameters", tool.parameters());
            ObjectNode wrapped = objectMapper.createObjectNode();
            wrapped.put("type", "function");
            wrapped.set("function", function);
            array.add(wrapped);
        }
        return array;
    }

    private static String argumentsOf(JsonNode call) {
        JsonNode arguments = call.path("function").get("arguments");
        if (arguments == null || arguments.isNull()) {
            return "{}";
        }
        if (arguments.isTextual()) {
            return arguments.asText();
        }
        return arguments.toString();
    }

    private static String textOrFallback(String content, List<ToolTrace> trace) {
        if (content != null && !content.isBlank()) {
            return content;
        }
        if (trace.isEmpty()) {
            return "没有生成回复。";
        }
        List<String> labels = trace.stream().map(ToolTrace::label).toList();
        return "已完成这些操作：" + String.join("、", labels) + "。请再问一次，我会根据结果说明。";
    }

    static boolean isToolUnsupported(Throwable error) {
        String message = error.getMessage() == null ? "" : error.getMessage().toLowerCase(Locale.ROOT);
        return message.contains("tool") || message.contains("function calling") || message.contains("functions");
    }

    private static final class AgentReplyException extends RuntimeException {
        private final String reply;
        private final List<ToolTrace> trace;

        private AgentReplyException(String reply, List<ToolTrace> trace) {
            this.reply = reply;
            this.trace = trace;
        }
    }

    public record ToolTrace(String name, String label, boolean ok) {
    }

    public record Result(String reply, List<ToolTrace> toolTrace) {
    }
}
