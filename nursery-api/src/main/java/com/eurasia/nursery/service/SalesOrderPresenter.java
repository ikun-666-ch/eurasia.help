package com.eurasia.nursery.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SalesOrderPresenter {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> mapOrderRow(Map<String, Object> o) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", intVal(o.get("id")));
        row.put("orderNo", str(o.get("orderNo")));
        row.put("customerName", str(o.get("customerName")));
        row.put("city", str(o.get("city")));
        row.put("district", str(o.get("district")));
        row.put("status", str(o.get("status")));
        Object rejectedAt = o.get("rejectedAt");
        row.put("rejectedAt", rejectedAt == null ? null : str(rejectedAt));
        row.put("totalAmount", num(o.get("totalAmount")));
        Object sat = o.get("satisfaction");
        row.put("satisfaction", sat == null ? null : intVal(sat));
        row.put("createdAt", formatDateTime(o.get("createdAt")));
        row.put("trackingNo", str(o.get("trackingNo")));
        row.put("trackingCom", str(o.get("trackingCom")));
        row.put("variety", str(o.get("variety")));
        row.put("specification", str(o.get("specification")));
        row.put("quantity", intVal(o.get("quantity")));
        row.put("costAmount", nullableNum(o.get("costAmount")));
        row.put("profitAmount", nullableNum(o.get("profitAmount")));
        Object spId = o.get("salespersonId");
        row.put("salespersonId", spId == null ? null : intVal(spId));
        row.put("salespersonName", str(o.get("salespersonName")));
        row.put("media", parseMedia(o.get("media")));
        return row;
    }

    public Map<String, Object> mapPendingRow(Map<String, Object> o) {
        Map<String, Object> row = mapOrderRow(o);
        String status = str(o.get("status"));
        String rejectedAt = o.get("rejectedAt") == null ? null : str(o.get("rejectedAt"));
        row.put("statusLabel", SalesWorkflowService.statusLabel(status, rejectedAt));
        row.put("actionLabel", SalesWorkflowService.pendingActionLabel(status));
        return row;
    }

    private static String formatDateTime(Object v) {
        if (v == null) {
            return "";
        }
        if (v instanceof LocalDateTime dt) {
            return dt.toString().replace('T', ' ');
        }
        return String.valueOf(v);
    }

    private static String str(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static int intVal(Object v) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception e) {
            return 0;
        }
    }

    private static double num(Object v) {
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return 0;
        }
    }

    private static Double nullableNum(Object v) {
        if (v == null || String.valueOf(v).isBlank()) {
            return null;
        }
        return num(v);
    }

    private static List<String> parseMedia(Object v) {
        if (v == null) return Collections.emptyList();
        String s = String.valueOf(v).trim();
        if (s.isEmpty() || s.equals("null")) return Collections.emptyList();
        try {
            return objectMapper.readValue(s, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
