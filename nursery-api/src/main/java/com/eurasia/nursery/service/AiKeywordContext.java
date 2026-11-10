package com.eurasia.nursery.service;

import com.eurasia.nursery.mapper.AiDataContextMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 旧版关键词只读摘要。仅在未启用 Agent，或模型不支持工具时使用。 */
@Component
public class AiKeywordContext {

    private final AiDataContextMapper aiDataContextMapper;

    public AiKeywordContext(AiDataContextMapper aiDataContextMapper) {
        this.aiDataContextMapper = aiDataContextMapper;
    }

    public String build(String userMsg) {
        String lower = userMsg == null ? "" : userMsg.toLowerCase(Locale.ROOT);
        List<String> parts = new ArrayList<>();

        if (containsAny(lower, "库存", "品种", "sku", "存货", "苗", "inv")) {
            addIfPresent(parts, "【库存数据】\n" + queryInventorySummary());
        }
        if (containsAny(lower, "销售", "订单", "卖", "收入", "客户", "sal")) {
            addIfPresent(parts, "【销售数据】\n" + querySalesSummary());
        }
        if (containsAny(lower, "财务", "资产", "成本", "盈利", "利润", "fin")) {
            addIfPresent(parts, "【财务数据】\n" + queryFinanceSummary());
        }
        if (parts.isEmpty() || containsAny(lower, "所有", "全部", "整体", "概况", "总览")) {
            if (parts.stream().noneMatch(p -> p.startsWith("【库存数据】"))) {
                addIfPresent(parts, "【库存数据】\n" + queryInventorySummary());
            }
            if (parts.stream().noneMatch(p -> p.startsWith("【销售数据】"))) {
                addIfPresent(parts, "【销售数据】\n" + querySalesSummary());
            }
        }
        return String.join("\n\n", parts);
    }

    private static void addIfPresent(List<String> parts, String text) {
        if (text != null && !text.isBlank()) {
            parts.add(text);
        }
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String queryInventorySummary() {
        try {
            int totalSkus = aiDataContextMapper.countSkus();
            BigDecimal totalStock = aiDataContextMapper.totalStock();
            List<Map<String, Object>> cats = aiDataContextMapper.categoryCounts();
            List<String> catList = new ArrayList<>();
            for (Map<String, Object> c : cats) {
                catList.add(c.get("name") + "(" + c.get("cnt") + "个SKU)");
            }
            List<Map<String, Object>> skus = aiDataContextMapper.skuStockBreakdown();
            List<String> skuLines = new ArrayList<>();
            for (Map<String, Object> sku : skus) {
                skuLines.add(String.format("  %s %s: %.0f 株", sku.get("variety"), sku.get("specification"),
                        toDouble(sku.get("stock"))));
            }
            return String.format(
                    "总品类数：%d，总SKU数：%d，总库存量：%.0f 株\n品类分布：%s\n各品种明细：\n%s",
                    cats.size(), totalSkus, totalStock.doubleValue(), String.join("、", catList),
                    String.join("\n", skuLines));
        } catch (Exception e) {
            return "";
        }
    }

    private String querySalesSummary() {
        try {
            int total = aiDataContextMapper.countOrders();
            BigDecimal amount = aiDataContextMapper.totalSalesAmount();
            BigDecimal thisMonth = aiDataContextMapper.thisMonthSales();
            int pending = aiDataContextMapper.pendingOrders();
            int shipped = aiDataContextMapper.shippedOrders();
            return String.format("总订单数：%d，总销售额：%.2f 万元\n本月销售额：%.2f 万元\n待处理：%d 单，已发货：%d 单",
                    total, amount.doubleValue() / 10000, thisMonth.doubleValue() / 10000, pending, shipped);
        } catch (Exception e) {
            return "";
        }
    }

    private String queryFinanceSummary() {
        try {
            BigDecimal revenue = aiDataContextMapper.totalRevenue();
            BigDecimal thisMonth = aiDataContextMapper.thisMonthRevenue();
            BigDecimal asset = aiDataContextMapper.totalAssetValue();
            return String.format("累计收入：%.2f 万元，本月收入：%.2f 万元，资产估值：%.2f 万元",
                    revenue.doubleValue() / 10000, thisMonth.doubleValue() / 10000, asset.doubleValue() / 10000);
        } catch (Exception e) {
            return "";
        }
    }

    private static double toDouble(Object value) {
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
