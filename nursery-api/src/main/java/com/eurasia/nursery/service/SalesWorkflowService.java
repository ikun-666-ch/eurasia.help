package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.*;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class SalesWorkflowService {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PENDING = "CONFIRMED";
    public static final String STATUS_SHIPPED = "SHIPPING";
    public static final String STATUS_SETTLED = "DONE";
    public static final String STATUS_CANCELLED = "CANCELLED";

    private final SalesOrderMapper salesOrderMapper;
    private final CustomerMapper customerMapper;
    private final SkuMapper skuMapper;
    private final InventoryStockMapper inventoryStockMapper;
    private final StockRecordMapper stockRecordMapper;
    private final FinanceMonthlyMapper financeMonthlyMapper;
    private final ObjectMapper objectMapper;
    private final SalesOrderPresenter presenter;
    private final PageAccessService pageAccessService;

    public SalesWorkflowService(
            SalesOrderMapper salesOrderMapper,
            ObjectMapper objectMapper,
            CustomerMapper customerMapper,
            SkuMapper skuMapper,
            InventoryStockMapper inventoryStockMapper,
            StockRecordMapper stockRecordMapper,
            FinanceMonthlyMapper financeMonthlyMapper,
            SalesOrderPresenter presenter,
            PageAccessService pageAccessService) {
        this.objectMapper = objectMapper;
        this.salesOrderMapper = salesOrderMapper;
        this.customerMapper = customerMapper;
        this.skuMapper = skuMapper;
        this.inventoryStockMapper = inventoryStockMapper;
        this.stockRecordMapper = stockRecordMapper;
        this.financeMonthlyMapper = financeMonthlyMapper;
        this.presenter = presenter;
        this.pageAccessService = pageAccessService;
    }

    public static String statusLabel(String status, String rejectedAt) {
        String label = switch (status == null ? "" : status.toUpperCase()) {
            case STATUS_DRAFT -> "草稿";
            case STATUS_PENDING -> "待审核出库";
            case STATUS_SHIPPED -> "已出库待结算";
            case STATUS_SETTLED -> "已结算";
            case STATUS_CANCELLED -> "已取消";
            default -> status;
        };
        if (STATUS_DRAFT.equalsIgnoreCase(status) && rejectedAt != null && !rejectedAt.isBlank()) {
            return label + "（被驳回）";
        }
        return label;
    }

    public static String pendingActionLabel(String status) {
        return switch (status == null ? "" : status.toUpperCase()) {
            case STATUS_DRAFT -> "确认规格并提交";
            case STATUS_PENDING -> "填写单号并发货";
            case STATUS_SHIPPED -> "确认费用与利润";
            default -> "处理";
        };
    }

    public Map<String, Object> createDraftOrder(UserView user, Map<String, Object> body) {
        long customerId = longVal(body.get("customerId"));
        String customerName = trim(body.get("customerName"));
        String city = trim(body.get("city"));
        String district = trim(body.get("district"));
        String variety = trim(body.get("variety"));
        String specification = trim(body.get("specification"));
        int quantity = intVal(body.get("quantity"));
        double totalAmount = doubleVal(body.get("totalAmount"));

        if (variety.isEmpty() || specification.isEmpty()) {
            throw new BusinessException("请填写品种和规格");
        }
        if (quantity <= 0) {
            throw new BusinessException("数量必须大于 0");
        }
        if (totalAmount <= 0) {
            throw new BusinessException("订单金额必须大于 0");
        }

        if (customerId > 0) {
            Map<String, Object> customer = customerMapper.findById(customerId);
            if (customer == null) {
                throw new BusinessException("客户不存在");
            }
            String customerRegion = trim(customer.get("region"));
            String customerDistrict = trim(customer.get("district"));
            if (!city.isEmpty() && !customerRegion.isEmpty() && !customerRegion.equals(city)) {
                throw new BusinessException("所选客户与地市筛选不一致");
            }
            if (!district.isEmpty() && !customerDistrict.isEmpty() && !customerDistrict.equals(district)) {
                throw new BusinessException("所选客户与区县筛选不一致");
            }
            if (city.isEmpty() && !customerRegion.isEmpty()) {
                city = customerRegion;
            }
            if (district.isEmpty() && !customerDistrict.isEmpty()) {
                district = customerDistrict;
            }
        } else {
            if (customerName.isEmpty() || city.isEmpty()) {
                throw new BusinessException("请填写客户名称和地市，或从已有客户中选择");
            }
            customerMapper.insert(customerName, customerName, city, emptyToNull(district), "B", null);
            customerId = customerMapper.lastInsertId();
        }

        if (city.isEmpty()) {
            throw new BusinessException("请填写或选择客户所属地市");
        }

        String orderNo = nextOrderNo();
        String mediaJson = toJsonArray(body.get("media"));
        salesOrderMapper.insert(orderNo, customerId, STATUS_DRAFT, BigDecimal.valueOf(totalAmount),
                user.getId(), variety, specification, quantity, mediaJson);
        Long orderId = salesOrderMapper.lastInsertId();
        Map<String, Object> order = salesOrderMapper.findViewById(orderId);
        if (order == null) {
            throw new BusinessException("创建订单失败", 500);
        }
        return presenter.mapOrderRow(order);
    }

    public Map<String, Object> submitOrder(UserView user, long orderId, Map<String, Object> body) {
        Map<String, Object> order = requireOrder(orderId);
        if (!canSubmitOrder(user, order)) {
            throw new BusinessException("无权提交该订单");
        }
        if (!STATUS_DRAFT.equals(String.valueOf(order.get("status")))) {
            throw new BusinessException("仅草稿订单可提交审核");
        }
        applyDraftFields(orderId, body);
        salesOrderMapper.updateStatus(orderId, STATUS_PENDING, null, null);
        return getOrderView(orderId);
    }

    @Transactional
    public Map<String, Object> shipOrder(UserView user, long orderId, Map<String, Object> body) {
        if (!canShipOrder(user)) {
            throw new BusinessException("无权执行出库");
        }
        String trackingNo = trim(body.get("trackingNo"));
        if (trackingNo.isEmpty()) {
            throw new BusinessException("请填写快递单号");
        }
        String trackingCom = trim(body.get("trackingCom"));
        String mediaJson = toJsonArray(body.get("media"));

        Map<String, Object> order = salesOrderMapper.findForWorkflow(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        if (!STATUS_PENDING.equals(String.valueOf(order.get("status")))) {
            throw new BusinessException("仅待审核订单可出库");
        }

        salesOrderMapper.updateTracking(orderId, trackingNo, trackingCom.isEmpty() ? null : trackingCom, mediaJson);

        String variety = trim(order.get("variety"));
        String spec = trim(order.get("specification"));
        double qty = doubleVal(order.get("quantity"));
        String city = trim(order.get("city"));
        if (variety.isEmpty() || spec.isEmpty() || qty <= 0) {
            throw new BusinessException("订单缺少品种、规格或数量");
        }

        Long skuId = skuMapper.findDuplicate(variety, spec);
        if (skuId == null) {
            throw new BusinessException("未找到对应品种规格库存");
        }

        Map<String, Object> stock = inventoryStockMapper.findStockForShip(skuId, city);
        String routeNote = null;
        if (stock == null) {
            stock = inventoryStockMapper.findAnyStockForShip(skuId);
            if (stock == null) {
                throw new BusinessException("全省无该品种库存，无法出库");
            }
            String stockCity = trim(stock.get("city"));
            routeNote = "已从" + (stockCity.isEmpty() ? "总仓" : stockCity) + "调货";
        }
        double stockQty = doubleVal(stock.get("quantity"));
        if (stockQty < qty) {
            stock = inventoryStockMapper.findAnyStockForShip(skuId);
            if (stock == null || doubleVal(stock.get("quantity")) < qty) {
                throw new BusinessException("库存不足，无法出库");
            }
            String stockCity = trim(stock.get("city"));
            routeNote = "已从" + (stockCity.isEmpty() ? "总仓" : stockCity) + "调货";
        }

        long stockId = ((Number) stock.get("id")).longValue();
        inventoryStockMapper.deductQuantity(stockId, BigDecimal.valueOf(qty));
        stockRecordMapper.insert(skuId, "OUT", BigDecimal.valueOf(qty),
                "销售出库 " + order.get("order_no"), user.getId(), mediaJson);
        salesOrderMapper.updateStatusOnly(orderId, STATUS_SHIPPED);
        Map<String, Object> result = getOrderView(orderId);
        if (routeNote != null) {
            result.put("routeNote", routeNote);
        }
        return result;
    }

    public Map<String, Object> settleOrder(UserView user, long orderId, Map<String, Object> body) {
        if (!canSettleOrder(user)) {
            throw new BusinessException("无权结算");
        }
        Map<String, Object> order = requireOrder(orderId);
        if (!STATUS_SHIPPED.equals(String.valueOf(order.get("status")))) {
            throw new BusinessException("仅已出库订单可结算");
        }

        double totalAmount = doubleVal(order.get("total_amount"));
        double costAmount = body.containsKey("costAmount") ? doubleVal(body.get("costAmount"))
                : doubleVal(body.get("cost"));
        if (costAmount <= 0) {
            throw new BusinessException("请填写成本费用");
        }
        if (costAmount > totalAmount) {
            throw new BusinessException("成本不能高于订单金额");
        }

        double profitAmount = body.containsKey("profitAmount") || body.containsKey("profit")
                ? (body.containsKey("profitAmount") ? doubleVal(body.get("profitAmount")) : doubleVal(body.get("profit")))
                : totalAmount - costAmount;
        if (profitAmount < 0) {
            throw new BusinessException("利润不能为负数");
        }

        int satisfaction = body.containsKey("satisfaction") ? intVal(body.get("satisfaction")) : 5;
        if (satisfaction < 1 || satisfaction > 5) {
            throw new BusinessException("满意度应为 1-5 分");
        }

        salesOrderMapper.updateSettled(orderId, STATUS_SETTLED, BigDecimal.valueOf(costAmount),
                BigDecimal.valueOf(profitAmount), satisfaction);
        syncFinanceMonthly(order, costAmount, profitAmount);
        return getOrderView(orderId);
    }

    public Map<String, Object> rejectOrder(UserView user, long orderId, String reason) {
        Map<String, Object> order = requireOrder(orderId);
        if (!canRejectOrder(user, order)) {
            throw new BusinessException("无权驳回该订单");
        }
        if (!STATUS_PENDING.equals(String.valueOf(order.get("status")))) {
            throw new BusinessException("仅待审核出库订单可驳回");
        }
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        salesOrderMapper.updateStatus(orderId, STATUS_DRAFT, now, reason);
        return getOrderView(orderId);
    }

    @Transactional
    public Map<String, Object> cancelOrder(UserView user, long orderId) {
        Map<String, Object> order = salesOrderMapper.findForWorkflow(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        if (!canCancelOrder(user, order)) {
            throw new BusinessException("无权取消该订单");
        }

        String status = String.valueOf(order.get("status")).toUpperCase();
        if (STATUS_SHIPPED.equals(status)) {
            restockShippedOrder(user, order);
        }
        salesOrderMapper.updateStatusOnly(orderId, STATUS_CANCELLED);
        return getOrderView(orderId);
    }

    public List<Map<String, Object>> listPending(UserView user, String scope) {
        List<String> scopes = pageAccessService.workflowScopesForUser(user);
        if (scopes.isEmpty()) {
            return List.of();
        }
        List<String> statuses;
        if (scope != null && !scope.isBlank()) {
            if (!scopes.contains(scope)) {
                throw new BusinessException("无权查看该待办");
            }
            statuses = pendingStatusesForScope(scope);
        } else {
            statuses = new ArrayList<>();
            for (String s : scopes) {
                statuses.addAll(pendingStatusesForScope(s));
            }
            statuses = statuses.stream().distinct().toList();
        }
        if (statuses.isEmpty()) {
            return List.of();
        }
        return salesOrderMapper.listPending(statuses).stream().map(presenter::mapPendingRow).toList();
    }

    public int pendingCount(UserView user, String scope) {
        return listPending(user, scope).size();
    }

    public boolean canCreateOrder(UserView user) {
        return hasWorkflowScope(user, "sales");
    }

    private boolean canSubmitOrder(UserView user, Map<String, Object> order) {
        return hasWorkflowScope(user, "sales") && STATUS_DRAFT.equals(String.valueOf(order.get("status")));
    }

    private boolean canShipOrder(UserView user) {
        return hasWorkflowScope(user, "inventory");
    }

    private boolean canSettleOrder(UserView user) {
        return hasWorkflowScope(user, "finance");
    }

    private boolean canRejectOrder(UserView user, Map<String, Object> order) {
        return hasWorkflowScope(user, "inventory") && STATUS_PENDING.equals(String.valueOf(order.get("status")));
    }

    private boolean canCancelOrder(UserView user, Map<String, Object> order) {
        String status = String.valueOf(order.get("status")).toUpperCase();
        if (STATUS_SETTLED.equals(status) || STATUS_CANCELLED.equals(status)) {
            return false;
        }
        List<String> scopes = pageAccessService.workflowScopesForUser(user);
        boolean hasSales = scopes.contains("sales");
        boolean hasInv = scopes.contains("inventory");
        boolean isAdmin = "ADMIN".equals(user.getRoleCode());
        if (STATUS_DRAFT.equals(status) && hasSales) {
            return true;
        }
        if (STATUS_PENDING.equals(status) && (hasSales || hasInv)) {
            return true;
        }
        return STATUS_SHIPPED.equals(status) && (hasInv || isAdmin);
    }

    private boolean hasWorkflowScope(UserView user, String scope) {
        return pageAccessService.workflowScopesForUser(user).contains(scope);
    }

    private List<String> pendingStatusesForScope(String scope) {
        return switch (scope) {
            case "sales" -> List.of(STATUS_DRAFT);
            case "inventory" -> List.of(STATUS_PENDING);
            case "finance" -> List.of(STATUS_SHIPPED);
            default -> List.of();
        };
    }

    private void applyDraftFields(long orderId, Map<String, Object> body) {
        Map<String, Object> existing = requireOrder(orderId);
        String variety = body.containsKey("variety") ? trim(body.get("variety")) : trim(existing.get("variety"));
        String spec = body.containsKey("specification") ? trim(body.get("specification")) : trim(existing.get("specification"));
        int qty = body.containsKey("quantity") ? intVal(body.get("quantity")) : intVal(existing.get("quantity"));
        double amount = body.containsKey("totalAmount") ? doubleVal(body.get("totalAmount")) : doubleVal(existing.get("total_amount"));

        if (body.containsKey("variety") && variety.isEmpty()) {
            throw new BusinessException("请填写品种");
        }
        if (body.containsKey("specification") && spec.isEmpty()) {
            throw new BusinessException("请填写规格");
        }
        if (body.containsKey("quantity") && qty <= 0) {
            throw new BusinessException("数量必须大于 0");
        }
        if (body.containsKey("totalAmount") && amount <= 0) {
            throw new BusinessException("订单金额必须大于 0");
        }

        if (body.containsKey("variety") || body.containsKey("specification")
                || body.containsKey("quantity") || body.containsKey("totalAmount")) {
            salesOrderMapper.updateDraftFields(orderId, variety, spec, qty, BigDecimal.valueOf(amount));
        }
    }

    private void restockShippedOrder(UserView user, Map<String, Object> order) {
        String variety = trim(order.get("variety"));
        String spec = trim(order.get("specification"));
        double qty = doubleVal(order.get("quantity"));
        String city = trim(order.get("city"));
        if (variety.isEmpty() || spec.isEmpty() || qty <= 0) {
            return;
        }
        Long skuId = skuMapper.findDuplicate(variety, spec);
        if (skuId == null) {
            return;
        }
        Long stockId = inventoryStockMapper.findStockIdForRestock(skuId, city);
        if (stockId != null) {
            inventoryStockMapper.addQuantity(stockId, BigDecimal.valueOf(qty));
        } else {
            inventoryStockMapper.insert(skuId, "主仓库", city.isEmpty() ? null : city, BigDecimal.valueOf(qty));
        }
        stockRecordMapper.insert(skuId, "IN", BigDecimal.valueOf(qty),
                "取消出库回补 " + order.get("order_no"), user.getId(), null);
    }

    private void syncFinanceMonthly(Map<String, Object> order, double costAmount, double profitAmount) {
        String ym = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        double revenue = doubleVal(order.get("total_amount"));
        if (financeMonthlyMapper.findIdByMonth(ym) != null) {
            financeMonthlyMapper.addToMonth(ym, BigDecimal.valueOf(revenue), BigDecimal.valueOf(costAmount),
                    BigDecimal.valueOf(profitAmount));
        } else {
            financeMonthlyMapper.insertMonth(ym, BigDecimal.valueOf(revenue), BigDecimal.valueOf(costAmount),
                    BigDecimal.valueOf(profitAmount));
        }

        String city = trim(order.get("city"));
        if (city.isEmpty()) {
            Map<String, Object> cust = customerMapper.findById(((Number) order.get("customer_id")).longValue());
            if (cust != null) {
                city = trim(cust.get("region"));
            }
        }
        if (city.isEmpty()) {
            return;
        }
        if (financeMonthlyMapper.findCityId(ym, city) != null) {
            financeMonthlyMapper.addToCityMonth(ym, city, BigDecimal.valueOf(revenue), BigDecimal.valueOf(profitAmount));
        } else {
            financeMonthlyMapper.insertCityMonth(ym, city, BigDecimal.valueOf(revenue), BigDecimal.valueOf(profitAmount));
        }
    }

    private String nextOrderNo() {
        String prefix = "SO" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        int seq = salesOrderMapper.countByOrderNoPrefix(prefix) + 1;
        return String.format("%s%04d", prefix, seq);
    }

    private Map<String, Object> requireOrder(long orderId) {
        Map<String, Object> order = salesOrderMapper.findRawById(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        return order;
    }

    private Map<String, Object> getOrderView(long orderId) {
        Map<String, Object> order = salesOrderMapper.findViewById(orderId);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        return presenter.mapOrderRow(order);
    }

    private static String trim(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static String emptyToNull(String s) {
        return s == null || s.isEmpty() ? null : s;
    }

    private static long longVal(Object v) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return 0;
        }
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

    private static double doubleVal(Object v) {
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return 0;
        }
    }

    private String toJsonArray(Object value) {
        if (value instanceof String s && s.startsWith("[")) return s;
        if (value == null) return null;
        try { return objectMapper.writeValueAsString(value); } catch (Exception e) { return null; }
    }
}
