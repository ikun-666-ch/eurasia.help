package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.*;
import com.eurasia.nursery.support.DemoMetrics;
import com.eurasia.nursery.support.FinanceProfiles;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class FinanceService {

    private final FinanceSettingsMapper financeSettingsMapper;
    private final FinanceMonthlyMapper financeMonthlyMapper;
    private final FinanceCityProfileMapper financeCityProfileMapper;
    private final FinanceAssetStatMapper financeAssetStatMapper;
    private final FinanceSalesDistrictMapper financeSalesDistrictMapper;
    private final SalesOrderMapper salesOrderMapper;
    private final InventoryStockMapper inventoryStockMapper;
    private final DailyDataService dailyDataService;

    public FinanceService(
            FinanceSettingsMapper financeSettingsMapper,
            FinanceMonthlyMapper financeMonthlyMapper,
            FinanceCityProfileMapper financeCityProfileMapper,
            FinanceAssetStatMapper financeAssetStatMapper,
            FinanceSalesDistrictMapper financeSalesDistrictMapper,
            SalesOrderMapper salesOrderMapper,
            InventoryStockMapper inventoryStockMapper,
            DailyDataService dailyDataService) {
        this.financeSettingsMapper = financeSettingsMapper;
        this.financeMonthlyMapper = financeMonthlyMapper;
        this.financeCityProfileMapper = financeCityProfileMapper;
        this.financeAssetStatMapper = financeAssetStatMapper;
        this.financeSalesDistrictMapper = financeSalesDistrictMapper;
        this.salesOrderMapper = salesOrderMapper;
        this.inventoryStockMapper = inventoryStockMapper;
        this.dailyDataService = dailyDataService;
    }

    public Map<String, Object> summary(String city) {
        Map<String, Double> profile = financeProfileForSummary(city);
        List<Map<String, Object>> rows = city != null && !city.isBlank()
                ? financeMonthlyMapper.listByCity(city.trim())
                : financeMonthlyMapper.listAll();

        List<String> months = new ArrayList<>();
        List<Double> revenue = new ArrayList<>();
        List<Double> profit = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            months.add(String.valueOf(r.get("year_month")));
            revenue.add(num(r.get("revenue")));
            profit.add(num(r.get("profit")));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("months", months);
        out.put("revenue", revenue);
        out.put("profit", profit);
        out.put("assetValue", currentTotalAssetYuan(city));
        out.put("growthRates", List.of(profile.get("growth_rate_cumulative"), profile.get("growth_rate_yoy")));
        out.put("pieItems", List.of(
                Map.of("name", "Q1", "value", profile.get("q1_share")),
                Map.of("name", "Q2", "value", profile.get("q2_share")),
                Map.of("name", "Q3", "value", profile.get("q3_share")),
                Map.of("name", "Q4", "value", profile.get("q4_share"))
        ));
        out.put("city", city);
        return out;
    }

    public Map<String, Object> salesTrend(String city) {
        Map<String, Object> trend = dailyDataService.finSalesTrend(city);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("labels", trend.get("labels"));
        out.put("thisYear", trend.get("thisYear"));
        out.put("lastYear", trend.get("lastYear"));
        out.put("city", city);
        out.put("manualRequired", trend.get("manualRequired"));
        out.put("autoFillEnabled", trend.get("autoFillEnabled"));
        return out;
    }

    public Map<String, Object> assetStats(String city) {
        List<Map<String, Object>> rows = city != null && !city.isBlank()
                ? financeAssetStatMapper.listByCity(city.trim())
                : financeAssetStatMapper.listAggregated();
        List<Map<String, Object>> items = rows.stream().map(r -> Map.<String, Object>of(
                "label", r.get("label"),
                "value", num(r.get("value")),
                "label2", r.get("label2"),
                "value2", num(r.get("value2")),
                "unit", r.get("unit")
        )).toList();
        Map<String, Object> result = new java.util.HashMap<>(); result.put("city", city); result.put("items", items); return result;
    }

    public Map<String, Object> salesByCity() {
        List<Map<String, Object>> cities = salesOrderMapper.financeSalesByCity().stream()
                .map(r -> Map.<String, Object>of(
                        "city", r.get("city"),
                        "amount", num(r.get("total"))
                )).toList();
        return Map.of("cities", cities);
    }

    public Map<String, Object> salesByDistrict(String city) {
        if (city == null || city.isBlank()) {
            return Map.of("city", null, "districts", List.of());
        }
        List<Map<String, Object>> districts = financeSalesDistrictMapper.topByCity(city.trim()).stream()
                .map(r -> Map.<String, Object>of(
                        "district", r.get("district"),
                        "amount", num(r.get("amount"))
                )).toList();
        return Map.of("city", city.trim(), "districts", districts);
    }

    public Map<String, Object> updateSettings(UserView user, Map<String, Object> body, String queryCity) {
        requireFinanceRole(user);
        Object growthObj = body.get("growthRates");
        List<?> growth = growthObj instanceof List<?> list ? list : List.of(12, 18);
        Map<String, Double> q = defaultQuarterShares();
        Object pieObj = body.get("pieItems");
        if (pieObj instanceof List<?> pie) {
            for (Object item : pie) {
                if (item instanceof Map<?, ?> m) {
                    String name = String.valueOf(m.get("name")).toUpperCase();
                    if (q.containsKey(name)) {
                        q.put(name, num(m.get("value")));
                    }
                }
            }
        }
        financeSettingsMapper.updateSettings(
                bd(growth.size() > 0 ? growth.get(0) : 12),
                bd(growth.size() > 1 ? growth.get(1) : 18),
                bd(q.get("Q1")), bd(q.get("Q2")), bd(q.get("Q3")), bd(q.get("Q4"))
        );

        if (body.containsKey("assetValue")) {
            Map<String, Object> latest = financeMonthlyMapper.findLatest();
            if (latest != null) {
                financeMonthlyMapper.updateAssetById(((Number) latest.get("id")).longValue(), bd(body.get("assetValue")));
            }
            if (queryCity != null && !queryCity.isBlank()) {
                financeMonthlyMapper.updateCityLatestAsset(queryCity.trim(), bd(body.get("assetValue")));
            }
        }
        return summary(queryCity);
    }

    public Map<String, Object> updateSalesTrend(UserView user, Map<String, Object> body) {
        requireFinanceRole(user);
        String city = trim(body.get("city"));
        if (city.isEmpty()) {
            throw new BusinessException("地市不能为空");
        }
        Object thisObj = body.get("thisYear");
        Object lastObj = body.get("lastYear");
        if (!(thisObj instanceof List<?>) || !(lastObj instanceof List<?>)) {
            throw new BusinessException("数据格式错误");
        }
        dailyDataService.saveFinTrendManual(city, (List<?>) thisObj, (List<?>) lastObj);
        return salesTrend(city);
    }

    public Map<String, Object> updateAssetStats(UserView user, Map<String, Object> body) {
        requireFinanceRole(user);
        String city = trim(body.get("city"));
        if (city.isEmpty()) {
            throw new BusinessException("地市不能为空");
        }
        Object itemsObj = body.get("items");
        if (!(itemsObj instanceof List<?> items)) {
            throw new BusinessException("数据格式错误");
        }
        financeAssetStatMapper.deleteByCity(city);
        for (int i = 0; i < items.size(); i++) {
            if (!(items.get(i) instanceof Map<?, ?> item)) {
                continue;
            }
            financeAssetStatMapper.insert(
                    city,
                    str(item.get("label")),
                    bd(item.get("value")),
                    str(item.get("label2")),
                    bd(item.get("value2")),
                    strOrDefault(item.get("unit"), "处"),
                    i
            );
        }
        return assetStats(city);
    }

    public Map<String, Object> updateMonth(UserView user, Map<String, Object> body) {
        requireFinanceRole(user);
        String ym = trim(body.get("yearMonth"));
        if (ym.isEmpty()) {
            throw new BusinessException("月份不能为空");
        }
        double revenue = num(body.get("revenue"));
        double profit = num(body.get("profit"));
        double cost = revenue - profit;
        if (financeMonthlyMapper.findIdByMonth(ym) != null) {
            financeMonthlyMapper.updateMonth(ym, bd(revenue), bd(profit), bd(cost));
        } else {
            financeMonthlyMapper.insertMonth(ym, bd(revenue), bd(cost), bd(profit));
        }
        if (body.containsKey("assetValue")) {
            financeMonthlyMapper.updateAssetByMonth(ym, bd(body.get("assetValue")));
        }
        return summary(null);
    }

    public Map<String, Object> updateAssetValue(UserView user, Map<String, Object> body) {
        requireFinanceRole(user);
        Map<String, Object> latest = financeMonthlyMapper.findLatest();
        if (latest == null) {
            throw new BusinessException("暂无财务月报数据");
        }
        financeMonthlyMapper.updateAssetById(((Number) latest.get("id")).longValue(), bd(body.get("assetValue")));
        return summary(null);
    }

    private double currentTotalAssetYuan(String city) {
        if (city != null && !city.isBlank()) {
            double province = currentTotalAssetYuan(null);
            double w = DemoMetrics.cityWeights().getOrDefault(city.trim(), 0.1);
            return round2(province * w);
        }
        double launchStock = inventoryStockMapper.sumQuantity().doubleValue();
        if (launchStock <= 0) {
            launchStock = DemoMetrics.PROVINCE_STOCK_WANZHU;
        }
        double salesTotal = salesOrderMapper.sumTotalAmount().doubleValue();
        double soldWanZhu = DemoMetrics.salesYuanToStockWanZhu(salesTotal);
        double currentStock = Math.max(launchStock * DemoMetrics.MIN_STOCK_RATIO, launchStock - soldWanZhu);
        double inventoryBook = currentStock * DemoMetrics.BOOK_VALUE_PER_WANZHU_WAN * 10_000;
        double doneSales = salesOrderMapper.sumDoneAmount().doubleValue();
        double cash = doneSales * DemoMetrics.CASH_FROM_DONE_SALES_RATIO;
        return round2(inventoryBook + DemoMetrics.FIXED_ASSET_YUAN + cash);
    }

    private Map<String, Double> financeProfileForSummary(String city) {
        if (city != null && !city.isBlank()) {
            Map<String, Object> row = financeCityProfileMapper.findByCity(city.trim());
            if (row != null) {
                return mapProfileRow(row);
            }
            Map<String, Map<String, Double>> fallback = FinanceProfiles.cityProfiles();
            if (fallback.containsKey(city.trim())) {
                return fallback.get(city.trim());
            }
        }
        Map<String, Object> settings = financeSettingsMapper.findSettings();
        if (settings == null) {
            return defaultProfileFromSettings(null);
        }
        return mapProfileRow(settings);
    }

    private Map<String, Double> mapProfileRow(Map<String, Object> row) {
        Map<String, Double> p = new LinkedHashMap<>();
        p.put("growth_rate_cumulative", num(row.get("growth_rate_cumulative")));
        p.put("growth_rate_yoy", num(row.get("growth_rate_yoy")));
        p.put("q1_share", num(row.get("q1_share")));
        p.put("q2_share", num(row.get("q2_share")));
        p.put("q3_share", num(row.get("q3_share")));
        p.put("q4_share", num(row.get("q4_share")));
        return p;
    }

    private Map<String, Double> defaultProfileFromSettings(Map<String, Object> settings) {
        if (settings != null) {
            return mapProfileRow(settings);
        }
        Map<String, Double> p = new LinkedHashMap<>();
        p.put("growth_rate_cumulative", 12.0);
        p.put("growth_rate_yoy", 18.0);
        p.put("q1_share", 30.0);
        p.put("q2_share", 25.0);
        p.put("q3_share", 25.0);
        p.put("q4_share", 20.0);
        return p;
    }

    private Map<String, Double> defaultQuarterShares() {
        Map<String, Double> q = new LinkedHashMap<>();
        q.put("Q1", 30.0);
        q.put("Q2", 25.0);
        q.put("Q3", 25.0);
        q.put("Q4", 20.0);
        return q;
    }

    private void requireFinanceRole(UserView user) {
        String role = user.getRoleCode();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new BusinessException("权限不足", 403);
        }
    }

    private static String trim(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
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

    private static BigDecimal bd(Object v) {
        return BigDecimal.valueOf(num(v));
    }

    private static String str(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static String strOrDefault(Object v, String defaultVal) {
        return v == null || String.valueOf(v).isBlank() ? defaultVal : String.valueOf(v);
    }

    private static double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
