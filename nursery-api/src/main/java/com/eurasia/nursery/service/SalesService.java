package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.CustomerMapper;
import com.eurasia.nursery.mapper.SalesOrderMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
public class SalesService {

    private final SalesOrderMapper salesOrderMapper;
    private final CustomerMapper customerMapper;
    private final SalesWorkflowService salesWorkflowService;
    private final SalesOrderPresenter presenter;
    private final DailyDataService dailyDataService;
    private final Kuaidi100Client kuaidi100Client;

    public SalesService(
            SalesOrderMapper salesOrderMapper,
            CustomerMapper customerMapper,
            SalesWorkflowService salesWorkflowService,
            SalesOrderPresenter presenter,
            DailyDataService dailyDataService,
            Kuaidi100Client kuaidi100Client) {
        this.salesOrderMapper = salesOrderMapper;
        this.customerMapper = customerMapper;
        this.salesWorkflowService = salesWorkflowService;
        this.presenter = presenter;
        this.dailyDataService = dailyDataService;
        this.kuaidi100Client = kuaidi100Client;
    }

    public List<Map<String, Object>> listOrders(String city) {
        List<Map<String, Object>> rows = city != null && !city.isBlank()
                ? salesOrderMapper.listByCity(city.trim())
                : salesOrderMapper.listAll();
        return rows.stream().map(presenter::mapOrderRow).toList();
    }

    public List<Map<String, Object>> listSalesCustomers(UserView user, String city, String district) {
        if (!salesWorkflowService.canCreateOrder(user)) {
            throw new BusinessException("无权访问", 403);
        }
        return customerMapper.listForSales(
                blankToNull(city),
                blankToNull(district)
        ).stream().map(this::mapSalesCustomer).toList();
    }

    public Map<String, Object> createOrder(UserView user, Map<String, Object> body) {
        if (!salesWorkflowService.canCreateOrder(user)) {
            throw new BusinessException("无权创建订单", 403);
        }
        return salesWorkflowService.createDraftOrder(user, body);
    }

    public List<Map<String, Object>> listWorkflowPending(UserView user, String scope) {
        return salesWorkflowService.listPending(user, scope);
    }

    public Map<String, Object> workflowPendingCount(UserView user, String scope) {
        return Map.of("count", salesWorkflowService.pendingCount(user, scope));
    }

    public Map<String, Object> submitOrder(UserView user, long id, Map<String, Object> body) {
        return salesWorkflowService.submitOrder(user, id, body);
    }

    public Map<String, Object> shipOrder(UserView user, long id, Map<String, Object> body) {
        return salesWorkflowService.shipOrder(user, id, body);
    }

    public Map<String, Object> settleOrder(UserView user, long id, Map<String, Object> body) {
        return salesWorkflowService.settleOrder(user, id, body);
    }

    public Map<String, Object> cancelOrder(UserView user, long id) {
        return salesWorkflowService.cancelOrder(user, id);
    }

    public Map<String, Object> rejectOrder(UserView user, long id, String reason) {
        return salesWorkflowService.rejectOrder(user, id, reason);
    }

    public Map<String, Object> ordersByCity() {
        List<Map<String, Object>> cities = salesOrderMapper.ordersByCity().stream()
                .map(r -> Map.<String, Object>of(
                        "city", r.get("city"),
                        "orderCount", intVal(r.get("orderCount")),
                        "totalAmount", num(r.get("totalAmount"))
                )).toList();
        return Map.of("cities", cities);
    }

    public Map<String, Object> ordersByDistrict(String city) {
        if (city == null || city.isBlank()) {
            return Map.of("city", null, "districts", List.of());
        }
        List<Map<String, Object>> districts = salesOrderMapper.ordersByDistrict(city.trim()).stream()
                .map(r -> Map.<String, Object>of(
                        "district", r.get("district"),
                        "orderCount", intVal(r.get("orderCount")),
                        "totalAmount", num(r.get("totalAmount"))
                )).toList();
        return Map.of("city", city.trim(), "districts", districts);
    }

    public Map<String, Object> orderTrend(String city) {
        Map<String, Object> trend = dailyDataService.salOrderTrend(city);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("labels", trend.get("labels"));
        out.put("amounts", trend.get("amounts"));
        out.put("city", city);
        out.put("manualRequired", trend.get("manualRequired"));
        out.put("autoFillEnabled", trend.get("autoFillEnabled"));
        return out;
    }

    public Map<String, Object> summary(String city) {
        Map<String, Object> row = city != null && !city.isBlank()
                ? salesOrderMapper.summaryByCity(city.trim())
                : salesOrderMapper.summaryProvince();
        int orderCount = intVal(row.get("orderCount"));
        double total = num(row.get("total"));
        int customerCount = intVal(row.get("customerCount"));
        int regionCount = intVal(row.get("regionCount"));
        int doneCount = intVal(row.get("doneCount"));
        double avg = orderCount > 0 ? round2(total / orderCount) : 0;

        Map<String, Object> trend = dailyDataService.salOrderTrend(city);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("city", city);
        out.put("totalAmount", total);
        out.put("orderCount", orderCount);
        out.put("customerCount", customerCount);
        out.put("regionCount", regionCount);
        out.put("regionLabel", city != null && !city.isBlank() ? "覆盖区县" : "覆盖地市");
        out.put("doneOrderCount", doneCount);
        out.put("avgOrderAmount", avg);
        out.put("trendLabels", trend.get("labels"));
        out.put("trendAmounts", trend.get("amounts"));
        out.put("manualRequired", trend.get("manualRequired"));
        out.put("autoFillEnabled", trend.get("autoFillEnabled"));
        return out;
    }

    public Map<String, Object> ordersByMonth(String city) {
        int year = DailyDataService.launchDate().getYear();
        List<String> months = List.of(year + "-04", year + "-05", year + "-06");
        List<Map<String, Object>> rows = city != null && !city.isBlank()
                ? salesOrderMapper.ordersByMonthCity(city.trim(), months.get(0), months.get(1), months.get(2))
                : salesOrderMapper.ordersByMonthProvince(months.get(0), months.get(1), months.get(2));
        Map<String, Map<String, Object>> byMonth = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) {
            byMonth.put(String.valueOf(r.get("ym")), r);
        }
        List<Integer> orderCounts = new ArrayList<>();
        List<Double> amounts = new ArrayList<>();
        for (String ym : months) {
            Map<String, Object> m = byMonth.get(ym);
            orderCounts.add(m == null ? 0 : intVal(m.get("orderCount")));
            amounts.add(m == null ? 0.0 : num(m.get("totalAmount")));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("city", city);
        out.put("months", months);
        out.put("orderCounts", orderCounts);
        out.put("amounts", amounts);
        return out;
    }

    public Map<String, Object> updateOrder(UserView user, long id, Map<String, Object> body) {
        Map<String, Object> existing = salesOrderMapper.findRawById(id);
        if (existing == null) {
            throw new BusinessException("订单不存在");
        }
        long customerId = ((Number) existing.get("customer_id")).longValue();

        String orderNo = body.containsKey("orderNo") ? trim(body.get("orderNo")) : str(existing.get("order_no"));
        String trackingNo = body.containsKey("trackingNo") ? trim(body.get("trackingNo")) : str(existing.get("tracking_no"));
        String trackingCom = body.containsKey("trackingCom") ? trim(body.get("trackingCom")) : str(existing.get("tracking_com"));
        String variety = body.containsKey("variety") ? trim(body.get("variety")) : str(existing.get("variety"));
        String specification = body.containsKey("specification") ? trim(body.get("specification")) : str(existing.get("specification"));
        Integer quantity = body.containsKey("quantity")
                ? intVal(body.get("quantity"))
                : intVal(existing.get("quantity"));
        String status = str(existing.get("status"));
        if (body.containsKey("status") && !trim(body.get("status")).isEmpty()) {
            if (!"ADMIN".equals(user.getRoleCode())) {
                throw new BusinessException("订单状态请通过待处理流程变更", 403);
            }
            status = trim(body.get("status")).toUpperCase();
        }
        BigDecimal totalAmount = body.containsKey("totalAmount")
                ? BigDecimal.valueOf(num(body.get("totalAmount")))
                : toBigDecimal(existing.get("total_amount"));
        int satisfaction = body.containsKey("satisfaction")
                ? intVal(body.get("satisfaction"))
                : (existing.get("satisfaction") == null ? 0 : intVal(existing.get("satisfaction")));
        boolean satisfactionNull = !body.containsKey("satisfaction") && existing.get("satisfaction") == null;
        String createdAt = body.containsKey("createdAt")
                ? trim(body.get("createdAt"))
                : formatDateTimeForSql(existing.get("created_at"));

        if (satisfactionNull) {
            salesOrderMapper.updateFullNullableSat(id, orderNo, blankToNull(trackingNo), blankToNull(trackingCom),
                    variety, specification, quantity, status, totalAmount, createdAt);
        } else {
            salesOrderMapper.updateFull(id, orderNo, blankToNull(trackingNo), blankToNull(trackingCom),
                    variety, specification, quantity, status, totalAmount, satisfaction, createdAt);
        }

        if (body.containsKey("customerName") || body.containsKey("city") || body.containsKey("district")) {
            Map<String, Object> cust = customerMapper.findById(customerId);
            if (cust != null) {
                String name = body.containsKey("customerName") ? trim(body.get("customerName")) : str(cust.get("name"));
                String region = body.containsKey("city") ? trim(body.get("city")) : str(cust.get("region"));
                String district = body.containsKey("district") ? trim(body.get("district")) : str(cust.get("district"));
                customerMapper.updateRegionFields(customerId, name, region, blankToNull(district));
            }
        }

        Map<String, Object> order = salesOrderMapper.findViewById(id);
        if (order == null) {
            throw new BusinessException("订单不存在");
        }
        return presenter.mapOrderRow(order);
    }

    public Map<String, Object> queryTracking(Map<String, Object> body) {
        String num = trim(body.get("num"));
        String com = trim(body.get("com"));
        String phone = trim(body.get("phone")).replaceAll("\\s+", "");
        long orderId = longVal(body.get("orderId"));

        if (num.isEmpty()) {
            throw new BusinessException("请填写运单号");
        }
        if (num.length() > 64 || (!com.isEmpty() && com.length() > 40) || phone.length() > 32) {
            throw new BusinessException("参数过长");
        }
        if (!kuaidi100Client.isConfigured()) {
            throw new BusinessException(
                    "快递100未配置：请复制 data/express_config.example.php 为 data/express_config.php 并填入密钥", 503);
        }

        Map<String, Object> pipe = kuaidi100Client.queryPipeline(num, com, phone);
        if (Boolean.TRUE.equals(pipe.get("success"))) {
            @SuppressWarnings("unchecked")
            Map<String, Object> last = (Map<String, Object>) pipe.get("result");
            List<?> traces = last.get("data") instanceof List<?> list ? list : List.of();
            String resolvedCom = String.valueOf(pipe.get("resolved_com"));

            if (orderId > 0 && !resolvedCom.isBlank()) {
                salesOrderMapper.updateTracking(orderId, num, resolvedCom, null);
            }

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("com", resolvedCom);
            out.put("num", num);
            out.put("state", String.valueOf(last.getOrDefault("state", "")));
            out.put("message", String.valueOf(last.getOrDefault("message", "")));
            out.put("traces", traces);
            out.put("order", orderId > 0 ? getOrderView(orderId) : null);
            return out;
        }

        if (Integer.valueOf(408).equals(pipe.get("code"))) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("needPhone", true);
            out.put("com", String.valueOf(pipe.getOrDefault("com", "")));
            out.put("num", num);
            out.put("message", String.valueOf(pipe.getOrDefault("msg", "需要手机号后四位")));
            return out;
        }

        int code = pipe.get("code") instanceof Number n ? n.intValue() : 500;
        throw new BusinessException(String.valueOf(pipe.getOrDefault("msg", "查询失败")), code);
    }

    private Map<String, Object> getOrderView(long id) {
        Map<String, Object> order = salesOrderMapper.findViewById(id);
        return order == null ? null : presenter.mapOrderRow(order);
    }

    private Map<String, Object> mapSalesCustomer(Map<String, Object> c) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", intVal(c.get("id")));
        out.put("name", c.get("name"));
        out.put("contactName", c.get("contact_name"));
        out.put("region", c.get("region"));
        out.put("district", c.get("district") == null ? "" : c.get("district"));
        out.put("level", c.get("level") == null ? "B" : c.get("level"));
        return out;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static String trim(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
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

    private static BigDecimal toBigDecimal(Object v) {
        if (v == null) {
            return BigDecimal.ZERO;
        }
        if (v instanceof BigDecimal bd) {
            return bd;
        }
        if (v instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        return BigDecimal.valueOf(num(v));
    }

    private static Integer toInteger(Object v) {
        if (v == null) {
            return null;
        }
        return intVal(v);
    }

    private static String formatDateTimeForSql(Object v) {
        if (v == null) {
            return "";
        }
        if (v instanceof java.time.LocalDateTime ldt) {
            return ldt.toString().replace('T', ' ');
        }
        if (v instanceof java.sql.Timestamp ts) {
            return ts.toLocalDateTime().toString().replace('T', ' ');
        }
        if (v instanceof java.util.Date ud) {
            return ud.toInstant().atZone(java.time.ZoneId.of("Asia/Shanghai"))
                    .toLocalDateTime().toString().replace('T', ' ');
        }
        return String.valueOf(v).replace('T', ' ');
    }

    private static double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
