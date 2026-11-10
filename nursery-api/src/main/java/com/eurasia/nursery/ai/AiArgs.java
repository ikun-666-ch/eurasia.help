package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public final class AiArgs {
    private AiArgs() {
    }

    public static String action(JsonNode args) {
        return text(args, "action");
    }

    public static String text(JsonNode args, String field) {
        if (args == null || !args.has(field) || args.get(field).isNull()) {
            return "";
        }
        return args.get(field).asText("").trim();
    }

    public static boolean present(JsonNode args, String field) {
        if (args == null || !args.has(field) || args.get(field).isNull()) {
            return false;
        }
        JsonNode node = args.get(field);
        return !node.isTextual() || !node.asText().isBlank();
    }

    public static long requiredLong(JsonNode args, String field) {
        if (!present(args, field)) {
            throw new BusinessException("缺少 " + field);
        }
        JsonNode node = args.get(field);
        if (node.isNumber()) {
            return node.asLong();
        }
        try {
            return Long.parseLong(node.asText("").trim());
        } catch (NumberFormatException e) {
            throw new BusinessException(field + " 必须是数字");
        }
    }

    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    public static Map<String, Object> pick(ObjectMapper mapper, JsonNode args, String... fields) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (args == null) {
            return body;
        }
        for (String field : fields) {
            if (present(args, field)) {
                body.put(field, mapper.convertValue(args.get(field), Object.class));
            }
        }
        return body;
    }

    public static String normalizeStatus(String raw) {
        if (raw == null) {
            return "";
        }
        String text = raw.trim();
        if (text.isEmpty()) {
            return "";
        }
        return switch (text) {
            case "草稿", "DRAFT", "draft" -> "DRAFT";
            case "待审核", "待审核出库", "CONFIRMED", "confirmed" -> "CONFIRMED";
            case "已出库", "已出库待结算", "发货", "SHIPPING", "shipping" -> "SHIPPING";
            case "已结算", "完成", "DONE", "done" -> "DONE";
            case "已取消", "取消", "CANCELLED", "canceled", "CANCELED" -> "CANCELLED";
            default -> text.toUpperCase(Locale.ROOT);
        };
    }

    public static String normalizeScope(String raw) {
        if (raw == null) {
            return "";
        }
        return switch (raw.trim()) {
            case "销售", "sales" -> "sales";
            case "库存", "inventory" -> "inventory";
            case "财务", "finance" -> "finance";
            default -> raw.trim();
        };
    }

    public static boolean containsText(Object value, String needle) {
        if (needle == null || needle.isBlank()) {
            return true;
        }
        return String.valueOf(value == null ? "" : value).toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    public static boolean equalsText(Object value, String expected) {
        return String.valueOf(value == null ? "" : value).equalsIgnoreCase(expected == null ? "" : expected);
    }
}
