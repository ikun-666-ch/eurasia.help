package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.AiAuditMapper;
import com.eurasia.nursery.service.AdminService;
import com.eurasia.nursery.service.FinanceService;
import com.eurasia.nursery.service.InventoryService;
import com.eurasia.nursery.service.SalesService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AiUndoService {

    private final AiAuditMapper auditMapper;
    private final ObjectMapper objectMapper;
    private final InventoryService inventoryService;
    private final SalesService salesService;
    private final AdminService adminService;
    private final FinanceService financeService;

    public AiUndoService(AiAuditMapper auditMapper, ObjectMapper objectMapper, InventoryService inventoryService,
                         SalesService salesService, AdminService adminService, FinanceService financeService) {
        this.auditMapper = auditMapper;
        this.objectMapper = objectMapper;
        this.inventoryService = inventoryService;
        this.salesService = salesService;
        this.adminService = adminService;
        this.financeService = financeService;
    }

    public Map<String, Object> undo(UserView user, Long auditId) {
        Map<String, Object> row = auditId == null || auditId <= 0
                ? auditMapper.findLatestOpen(user.getId())
                : auditMapper.findOwned(auditId, user.getId());
        if (row == null || row.isEmpty()) {
            throw new BusinessException("没有可撤销的 AI 操作");
        }
        if (row.get("undoneAt") != null) {
            throw new BusinessException("这条已经撤销过");
        }
        long id = longVal(row.get("id"));
        String summary = String.valueOf(row.get("summary"));
        if (!isOne(row.get("reversible"))) {
            throw new BusinessException("这条操作不能自动撤销：" + summary);
        }
        reverse(user, String.valueOf(row.get("toolName")), String.valueOf(row.get("action")),
                parse(row.get("beforeJson")), parse(row.get("afterJson")));
        if (auditMapper.markUndone(id, user.getId()) == 0) {
            throw new BusinessException("撤销失败");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("auditId", id);
        out.put("summary", "已撤销：" + summary);
        return out;
    }

    private void reverse(UserView user, String tool, String action, Object before, Object after) {
        switch (tool + ":" + action) {
            case "inventory:create_ledger" -> inventoryService.deleteLedger(idOf(after));
            case "inventory:update_ledger" -> inventoryService.updateLedger(idOf(before), ledgerBody(before));
            case "inventory:delete_ledger" -> inventoryService.createLedger(user, ledgerBody(before));
            case "sales_order:create" -> salesService.cancelOrder(user, idOf(after));
            case "sales_order:update" -> salesService.updateOrder(user, idOf(before), orderBody(before, user));
            case "customers:create" -> adminService.deleteCustomer(idOf(after));
            case "customers:update" -> adminService.updateCustomer(idOf(before), mapOf(before));
            case "skus:create" -> adminService.deleteSku(idOf(after));
            case "skus:update" -> adminService.updateSku(idOf(before), mapOf(before));
            case "categories:create" -> adminService.deleteCategory(idOf(after));
            case "categories:update" -> adminService.updateCategory(idOf(before), mapOf(before));
            case "users:update" -> adminService.updateUser(idOf(before), userBody(before));
            case "roles:update" -> adminService.updateRole(idOf(before), mapOf(before));
            case "finance_update:month" -> financeService.updateMonth(user, mapOf(before));
            case "finance_update:settings" -> financeService.updateSettings(user, mapOf(before), null);
            case "system:update_settings" -> adminService.updateSystemSettings(mapOf(before));
            default -> throw new BusinessException("这条操作没有对应的撤销方法");
        }
    }

    private Map<String, Object> ledgerBody(Object value) {
        Map<String, Object> source = mapOf(value);
        Map<String, Object> body = new LinkedHashMap<>();
        copy(body, source, "variety", "specification", "quantity", "city", "warehouse");
        return body;
    }

    private Map<String, Object> orderBody(Object value, UserView user) {
        Map<String, Object> source = mapOf(value);
        Map<String, Object> body = new LinkedHashMap<>();
        copy(body, source, "orderNo", "trackingNo", "trackingCom", "variety", "specification", "quantity",
                "totalAmount", "satisfaction", "customerName", "city", "district");
        if ("ADMIN".equals(user.getRoleCode()) && source.get("status") != null) {
            body.put("status", source.get("status"));
        }
        return body;
    }

    private Map<String, Object> userBody(Object value) {
        Map<String, Object> source = mapOf(value);
        Map<String, Object> body = new LinkedHashMap<>();
        copy(body, source, "displayName", "status", "roleId", "phone");
        return body;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapOf(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            map.forEach((key, item) -> out.put(String.valueOf(key), item));
            return out;
        }
        throw new BusinessException("撤销快照已损坏");
    }

    private Object parse(Object json) {
        if (json == null || String.valueOf(json).isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(String.valueOf(json), new TypeReference<Object>() {});
        } catch (Exception e) {
            throw new BusinessException("撤销快照已损坏");
        }
    }

    private static void copy(Map<String, Object> target, Map<String, Object> source, String... keys) {
        for (String key : keys) {
            if (source.get(key) != null) {
                target.put(key, source.get(key));
            }
        }
    }

    private static long idOf(Object value) {
        if (value instanceof Map<?, ?> map) {
            return longVal(map.get("id"));
        }
        throw new BusinessException("撤销快照缺少 id");
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

    private static boolean isOne(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return "1".equals(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value));
    }
}
