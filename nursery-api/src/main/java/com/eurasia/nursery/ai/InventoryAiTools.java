package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.InventoryService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class InventoryAiTools {

    private final InventoryService inventoryService;
    private final ObjectMapper objectMapper;
    private final AiAccess access;
    private final AiWrites writes;

    public InventoryAiTools(InventoryService inventoryService, ObjectMapper objectMapper, AiAccess access, AiWrites writes) {
        this.inventoryService = inventoryService;
        this.objectMapper = objectMapper;
        this.access = access;
        this.writes = writes;
    }

    public AiTool tool() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "list_ledger 查台账；sku_catalog 品种规格目录；trends 趋势；create_ledger 新增台账并记入库；update_ledger 改台账；delete_ledger 删除台账。删除、把数量改成 0，或变动很大时要等用户下一条消息回复确认。",
                "list_ledger", "sku_catalog", "trends", "create_ledger", "update_ledger", "delete_ledger");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "台账 id。update_ledger、delete_ledger 必填");
        AiSchemas.prop(objectMapper, schema, "variety", "string", "品种。create 必填，list 时可选过滤");
        AiSchemas.prop(objectMapper, schema, "specification", "string", "规格。create 必填，list 时可选过滤");
        AiSchemas.prop(objectMapper, schema, "quantity", "number", "数量，按台账原值，单位株");
        AiSchemas.prop(objectMapper, schema, "warehouse", "string", "仓库，默认主仓库");
        AiSchemas.prop(objectMapper, schema, "city", "string", "地市");
        AiSchemas.enumProp(objectMapper, schema, "kind", "trends 用。stock 库存趋势，io 出入库趋势，both 两者", "stock", "io", "both");
        AiSchemas.require(objectMapper, schema, "action");
        Map<String, String> labels = Map.of(
                "list_ledger", "查询库存台账",
                "sku_catalog", "查询品种目录",
                "trends", "查询库存趋势",
                "create_ledger", "新增库存台账",
                "update_ledger", "更新库存台账",
                "delete_ledger", "删除库存台账"
        );
        return new AiTool("inventory",
                "库存台账、品种目录和趋势。只有库存角色或管理员能改台账。入库用 create_ledger。销售出库请用 sales_order 的 ship。",
                schema, labels, this::handle);
    }

    private Object handle(UserView caller, JsonNode args) {
        String action = AiArgs.action(args);
        return switch (action) {
            case "list_ledger" -> {
                access.requireAnyPage(caller, "inv");
                yield listLedger(args);
            }
            case "sku_catalog" -> {
                access.requireAnyPage(caller, "inv", "sal", "orders");
                yield inventoryService.skuCatalog();
            }
            case "trends" -> {
                access.requireAnyPage(caller, "inv");
                yield trends(args);
            }
            case "create_ledger" -> createLedger(caller, args);
            case "update_ledger" -> updateLedger(caller, args);
            case "delete_ledger" -> deleteLedger(caller, args);
            default -> AiResults.unknownAction("list_ledger", "sku_catalog", "trends", "create_ledger", "update_ledger", "delete_ledger");
        };
    }

    private Object createLedger(UserView caller, JsonNode args) {
        access.requireRoles(caller, "ADMIN", "INVENTORY");
        Map<String, Object> body = AiArgs.pick(objectMapper, args, "variety", "specification", "quantity", "warehouse", "city", "media");
        double quantity = number(body.get("quantity"));
        String summary = "新增库存台账 " + body.get("variety") + " " + body.get("specification") + "，数量 " + quantity;
        return writes.run(caller, "inventory", "create_ledger", summary, null, quantity >= 100, true,
                () -> inventoryService.createLedger(caller, body));
    }

    private Object updateLedger(UserView caller, JsonNode args) {
        access.requireRoles(caller, "ADMIN", "INVENTORY");
        long id = AiArgs.requiredLong(args, "id");
        Map<String, Object> before = findLedger(id);
        Map<String, Object> body = AiArgs.pick(objectMapper, args, "variety", "specification", "quantity", "warehouse", "city");
        double previous = number(before.get("quantity"));
        double next = body.containsKey("quantity") ? number(body.get("quantity")) : previous;
        String summary = "把台账 " + id + "（" + before.get("variety") + " " + before.get("specification")
                + "）数量从 " + previous + " 调整为 " + next;
        return writes.run(caller, "inventory", "update_ledger", summary, before, largeChange(previous, next), true,
                () -> inventoryService.updateLedger(id, body));
    }

    private Object deleteLedger(UserView caller, JsonNode args) {
        access.requireRoles(caller, "ADMIN", "INVENTORY");
        long id = AiArgs.requiredLong(args, "id");
        Map<String, Object> before = findLedger(id);
        String summary = "删除台账 " + id + "（" + before.get("variety") + " " + before.get("specification") + "，数量 " + before.get("quantity") + "）";
        return writes.run(caller, "inventory", "delete_ledger", summary, before, true, true, () -> {
            inventoryService.deleteLedger(id);
            return AiResults.deleted(id);
        });
    }

    private Map<String, Object> findLedger(long id) {
        for (Map<String, Object> row : inventoryService.listLedger()) {
            if (number(row.get("id")) == id) {
                return row;
            }
        }
        throw new BusinessException("库存记录不存在");
    }

    private Object listLedger(JsonNode args) {
        List<Map<String, Object>> rows = new ArrayList<>(inventoryService.listLedger());
        String variety = AiArgs.text(args, "variety");
        String specification = AiArgs.text(args, "specification");
        String city = AiArgs.text(args, "city");
        if (!variety.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("variety"), variety)).toList();
        }
        if (!specification.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("specification"), specification)).toList();
        }
        if (!city.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("city"), city)).toList();
        }
        return AiResults.listed(rows);
    }

    private Object trends(JsonNode args) {
        String city = AiArgs.blankToNull(AiArgs.text(args, "city"));
        String kind = AiArgs.text(args, "kind");
        if ("io".equals(kind)) {
            return inventoryService.ioTrend(city);
        }
        if ("both".equals(kind)) {
            Map<String, Object> both = new LinkedHashMap<>();
            both.put("stock", inventoryService.dailyTrend(city));
            both.put("io", inventoryService.ioTrend(city));
            return both;
        }
        return inventoryService.dailyTrend(city);
    }

    static boolean largeChange(double before, double after) {
        if (after == 0 && before != 0) {
            return true;
        }
        double delta = Math.abs(after - before);
        if (delta >= 100) {
            return true;
        }
        return before > 0 && delta / before >= 0.5 && delta >= 10;
    }

    private static double number(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }
}
