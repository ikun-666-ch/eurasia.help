package com.eurasia.nursery.ai;

import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Map;
import java.util.function.BiFunction;

public record AiTool(
        String name,
        String description,
        ObjectNode parameters,
        Map<String, String> actionLabels,
        BiFunction<UserView, JsonNode, Object> handler
) {
    public String label(String action) {
        if (action != null) {
            String label = actionLabels.get(action);
            if (label != null && !label.isBlank()) {
                return label;
            }
        }
        String fallback = actionLabels.get("");
        return fallback == null || fallback.isBlank() ? name : fallback;
    }
}
