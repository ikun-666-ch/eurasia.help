package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.SalesService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class SalesAiTools {

    private final SalesService salesService;
    private final ObjectMapper objectMapper;
    private final AiAccess access;
    private final AiWrites writes;

    public SalesAiTools(SalesService salesService, ObjectMapper objectMapper, AiAccess access, AiWrites writes) {
        this.salesService = salesService;
        this.objectMapper = objectMapper;
        this.access = access;
        this.writes = writes;
    }

    public List<AiTool> tools() {
        return List.of(queryTool(), orderTool());
    }

    private AiTool queryTool() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "summary 汇总；list_orders 订单；by_city 按地市；by_district 按区县；trend 趋势；by_month 按月；pending 待办。金额字段是元。",
                "summary", "list_orders", "by_city", "by_district", "trend", "by_month", "pending");
        AiSchemas.prop(objectMapper, schema, "city", "string", "地市。by_district 必填");
        AiSchemas.prop(objectMapper, schema, "status", "string", "订单状态：DRAFT/CONFIRMED/SHIPPING/DONE/CANCELLED，或中文");
        AiSchemas.prop(objectMapper, schema, "orderNo", "string", "订单号，模糊匹配");
        AiSchemas.prop(objectMapper, schema, "customerName", "string", "客户名，模糊匹配");
        AiSchemas.prop(objectMapper, schema, "variety", "string", "品种，模糊匹配");
        AiSchemas.enumProp(objectMapper, schema, "scope", "pending 的范围", "sales", "inventory", "finance");
        AiSchemas.require(objectMapper, schema, "action");
        Map<String, String> labels = Map.of(
                "summary", "查询销售汇总",
                "list_orders", "查询销售订单",
                "by_city", "查询地市销售",
                "by_district", "查询区县销售",
                "trend", "查询销售趋势",
                "by_month", "查询月度销售",
                "pending", "查询待办订单"
        );
        return new AiTool("sales_query", "查询销售汇总、订单、分布和待办。金额单位是元。", schema, labels, this::query);
    }

    private AiTool orderTool() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "create 新建草稿；update 改字段（status 只改字段，不扣库存不入账）；submit 提交审核；ship 出库发货并扣库存；settle 结算入账；cancel 取消，已出库会回补库存；reject 驳回；tracking 查物流。totalAmount 用元。",
                "create", "update", "submit", "ship", "settle", "cancel", "reject", "tracking");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "订单 id。除 create、tracking 外必填");
        AiSchemas.prop(objectMapper, schema, "customerId", "integer", "已有客户 id。与 customerName 二选一");
        AiSchemas.prop(objectMapper, schema, "customerName", "string", "新客户名称");
        AiSchemas.prop(objectMapper, schema, "city", "string", "地市");
        AiSchemas.prop(objectMapper, schema, "district", "string", "区县");
        AiSchemas.prop(objectMapper, schema, "variety", "string", "品种");
        AiSchemas.prop(objectMapper, schema, "specification", "string", "规格");
        AiSchemas.prop(objectMapper, schema, "quantity", "number", "数量");
        AiSchemas.prop(objectMapper, schema, "totalAmount", "number", "订单金额，单位元");
        AiSchemas.prop(objectMapper, schema, "orderNo", "string", "订单号");
        AiSchemas.prop(objectMapper, schema, "status", "string", "仅 update 时直接改状态字段");
        AiSchemas.prop(objectMapper, schema, "trackingNo", "string", "快递单号。ship 必填");
        AiSchemas.prop(objectMapper, schema, "trackingCom", "string", "快递公司");
        AiSchemas.prop(objectMapper, schema, "costAmount", "number", "结算成本，单位元");
        AiSchemas.prop(objectMapper, schema, "profitAmount", "number", "结算利润，单位元。不填则按金额减成本");
        AiSchemas.prop(objectMapper, schema, "satisfaction", "integer", "满意度 1-5");
        AiSchemas.prop(objectMapper, schema, "reason", "string", "驳回原因");
        AiSchemas.prop(objectMapper, schema, "num", "string", "物流运单号");
        AiSchemas.prop(objectMapper, schema, "com", "string", "物流公司编码");
        AiSchemas.prop(objectMapper, schema, "phone", "string", "收件手机，部分快递需要");
        AiSchemas.prop(objectMapper, schema, "orderId", "integer", "tracking 时回写订单");
        AiSchemas.prop(objectMapper, schema, "createdAt", "string", "创建时间");
        AiSchemas.require(objectMapper, schema, "action");
        Map<String, String> labels = Map.of(
                "create", "创建销售订单",
                "update", "更新销售订单",
                "submit", "提交订单审核",
                "ship", "订单出库发货",
                "settle", "结算订单",
                "cancel", "取消订单",
                "reject", "驳回订单",
                "tracking", "查询物流"
        );
        return new AiTool("sales_order",
                "创建和处理销售订单。改状态优先用 submit、ship、settle、cancel、reject。ship 会扣库存，settle 会记财务。金额用元。",
                schema, labels, this::order);
    }

    private Object query(UserView caller, JsonNode args) {
        access.requireAnyPage(caller, "sal", "orders", "inv", "fin");
        String city = AiArgs.blankToNull(AiArgs.text(args, "city"));
        return switch (AiArgs.action(args)) {
            case "summary" -> salesService.summary(city);
            case "list_orders" -> listOrders(args, city);
            case "by_city" -> salesService.ordersByCity();
            case "by_district" -> salesService.ordersByDistrict(city);
            case "trend" -> salesService.orderTrend(city);
            case "by_month" -> salesService.ordersByMonth(city);
            case "pending" -> {
                String scope = AiArgs.normalizeScope(AiArgs.text(args, "scope"));
                yield AiResults.listed(salesService.listWorkflowPending(caller, scope.isEmpty() ? null : scope));
            }
            default -> AiResults.unknownAction("summary", "list_orders", "by_city", "by_district", "trend", "by_month", "pending");
        };
    }

    private Object listOrders(JsonNode args, String city) {
        List<Map<String, Object>> rows = new ArrayList<>(salesService.listOrders(city));
        String status = AiArgs.normalizeStatus(AiArgs.text(args, "status"));
        String orderNo = AiArgs.text(args, "orderNo");
        String customerName = AiArgs.text(args, "customerName");
        String variety = AiArgs.text(args, "variety");
        if (!status.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.equalsText(row.get("status"), status)).toList();
        }
        if (!orderNo.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("orderNo"), orderNo)).toList();
        }
        if (!customerName.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("customerName"), customerName)).toList();
        }
        if (!variety.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("variety"), variety)).toList();
        }
        return AiResults.listed(rows);
    }

    private Object order(UserView caller, JsonNode args) {
        access.requireAnyPage(caller, "sal", "orders", "inv", "fin");
        String action = AiArgs.action(args);
        if ("create".equals(action)) {
            Map<String, Object> body = AiArgs.pick(objectMapper, args,
                    "customerId", "customerName", "city", "district", "variety", "specification", "quantity", "totalAmount", "media");
            String summary = "创建草稿订单 " + body.get("variety") + " " + body.get("specification")
                    + "，数量 " + body.get("quantity") + "，金额 " + body.get("totalAmount") + " 元";
            return writes.run(caller, "sales_order", "create", summary, null, false, true,
                    () -> salesService.createOrder(caller, body));
        }
        if ("tracking".equals(action)) {
            return salesService.queryTracking(AiArgs.pick(objectMapper, args, "num", "com", "phone", "orderId"));
        }
        long id = AiArgs.requiredLong(args, "id");
        return switch (action) {
            case "update" -> updateOrder(caller, id, args);
            case "submit" -> auditOrder(caller, "submit", id, "提交订单 " + id + " 审核", false,
                    () -> salesService.submitOrder(caller, id, AiArgs.pick(objectMapper, args,
                            "variety", "specification", "quantity", "totalAmount")));
            case "ship" -> auditOrder(caller, "ship", id, "订单 " + id + " 出库发货", false,
                    () -> salesService.shipOrder(caller, id, AiArgs.pick(objectMapper, args, "trackingNo", "trackingCom", "media")));
            case "settle" -> auditOrder(caller, "settle", id, "结算订单 " + id, false,
                    () -> salesService.settleOrder(caller, id, AiArgs.pick(objectMapper, args,
                            "costAmount", "cost", "profitAmount", "profit", "satisfaction")));
            case "cancel" -> auditOrder(caller, "cancel", id, "取消订单 " + id, false,
                    () -> salesService.cancelOrder(caller, id));
            case "reject" -> auditOrder(caller, "reject", id, "驳回订单 " + id, false,
                    () -> salesService.rejectOrder(caller, id, AiArgs.text(args, "reason")));
            default -> AiResults.unknownAction("create", "update", "submit", "ship", "settle", "cancel", "reject", "tracking");
        };
    }

    private Object updateOrder(UserView caller, long id, JsonNode args) {
        Map<String, Object> before = findOrder(id);
        Map<String, Object> body = AiArgs.pick(objectMapper, args,
                "orderNo", "trackingNo", "trackingCom", "variety", "specification", "quantity",
                "status", "totalAmount", "satisfaction", "createdAt", "customerName", "city", "district");
        if (body.containsKey("status")) {
            body.put("status", AiArgs.normalizeStatus(String.valueOf(body.get("status"))));
        }
        boolean statusChange = body.containsKey("status");
        String summary = "修改订单 " + id + "（" + before.get("orderNo") + "）字段 " + body.keySet();
        return writes.run(caller, "sales_order", "update", summary, before, false, !statusChange,
                () -> salesService.updateOrder(caller, id, body));
    }

    private Object auditOrder(UserView caller, String action, long id, String summary, boolean reversible,
                              java.util.function.Supplier<Object> write) {
        Map<String, Object> before = findOrder(id);
        return writes.run(caller, "sales_order", action, summary, before, false, reversible, write::get);
    }

    private Map<String, Object> findOrder(long id) {
        for (Map<String, Object> row : salesService.listOrders(null)) {
            Object value = row.get("id");
            long rowId = value instanceof Number number ? number.longValue() : 0;
            if (rowId == id) {
                return row;
            }
        }
        throw new BusinessException("订单不存在");
    }
}
