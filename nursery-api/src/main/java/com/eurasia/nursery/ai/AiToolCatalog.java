package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class AiToolCatalog implements AiToolExecutor {

    private final ObjectMapper objectMapper;
    private final List<AiTool> tools;
    private final Map<String, AiTool> byName;

    public AiToolCatalog(
            ObjectMapper objectMapper,
            InventoryAiTools inventory,
            SalesAiTools sales,
            FinanceAiTools finance,
            DirectoryAiTools directory,
            SystemAiTools system) {
        this(objectMapper, combine(inventory.tool(), sales.tools(), finance.tools(), directory.tools(), system.tools()));
    }

    AiToolCatalog(ObjectMapper objectMapper, List<AiTool> tools) {
        this.objectMapper = objectMapper;
        this.tools = List.copyOf(tools);
        Map<String, AiTool> index = new LinkedHashMap<>();
        for (AiTool tool : tools) {
            if (index.put(tool.name(), tool) != null) {
                throw new IllegalStateException("重复的 AI 工具：" + tool.name());
            }
        }
        this.byName = Map.copyOf(index);
    }

    @Override
    public List<AiTool> tools() {
        return tools;
    }

    @Override
    public Execution execute(String name, String argumentsJson, UserView caller) {
        AiTool tool = byName.get(name);
        if (tool == null) {
            return new Execution(AiResults.writeJson(objectMapper, AiResults.error("未知工具")), name, name, false);
        }
        JsonNode args;
        try {
            if (argumentsJson == null || argumentsJson.isBlank()) {
                args = objectMapper.createObjectNode();
            } else {
                args = objectMapper.readTree(argumentsJson);
            }
            if (args == null || !args.isObject()) {
                args = objectMapper.createObjectNode();
            }
        } catch (Exception e) {
            return new Execution(AiResults.writeJson(objectMapper, AiResults.error("参数不是合法 JSON")),
                    name, tool.label(""), false);
        }
        if (AiCallScope.cancelled()) {
            throw new AiCancelledException();
        }
        String label = tool.label(AiArgs.action(args));
        AiCallScope.status(label);
        try {
            Object result = tool.handler().apply(caller, args);
            boolean needsConfirmation = result instanceof Map<?, ?> map && Boolean.TRUE.equals(map.get("needsConfirmation"));
            return new Execution(AiResults.writeJson(objectMapper, result), name, label,
                    needsConfirmation || !AiResults.isFailure(result));
        } catch (BusinessException e) {
            return new Execution(AiResults.writeJson(objectMapper, AiResults.error(e.getMessage())), name, label, false);
        } catch (RuntimeException e) {
            return new Execution(AiResults.writeJson(objectMapper, AiResults.error(safeError(e))), name, label, false);
        }
    }

    private static String safeError(RuntimeException e) {
        String message = e.getMessage() == null ? "" : e.getMessage();
        String lower = message.toLowerCase();
        if (message.isBlank() || lower.contains("jdbc") || lower.contains("select ") || lower.contains("password") || lower.contains("secret")) {
            return "执行失败";
        }
        return message.length() > 200 ? message.substring(0, 200) : message;
    }

    private static List<AiTool> combine(AiTool first, List<AiTool>... rest) {
        List<AiTool> all = new ArrayList<>();
        all.add(first);
        for (List<AiTool> group : rest) {
            all.addAll(group);
        }
        return all;
    }
}
