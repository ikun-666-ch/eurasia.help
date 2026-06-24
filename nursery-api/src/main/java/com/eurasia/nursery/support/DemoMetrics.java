package com.eurasia.nursery.support;

/** 对齐 PHP DemoMetrics */
public final class DemoMetrics {

    public static final double PROVINCE_STOCK_WANZHU = 330.0;
    public static final double MIN_STOCK_RATIO = 0.92;
    public static final double AVG_SELL_PRICE_YUAN = 11.5;
    public static final double BOOK_VALUE_PER_WANZHU_WAN = 0.57;
    public static final double FIXED_ASSET_YUAN = 62_000;
    public static final double CASH_FROM_DONE_SALES_RATIO = 0.18;

    private DemoMetrics() {}

    public static double salesYuanToStockWanZhu(double yuan) {
        if (yuan <= 0 || AVG_SELL_PRICE_YUAN <= 0) {
            return 0;
        }
        return Math.round(yuan / AVG_SELL_PRICE_YUAN / 10_000 * 10_000) / 10_000.0;
    }

    public static java.util.Map<String, Double> cityOrderTotals() {
        java.util.Map<String, Double> m = new java.util.LinkedHashMap<>();
        m.put("西安市", 307_000.0);
        m.put("铜川市", 57_000.0);
        m.put("宝鸡市", 108_000.0);
        m.put("咸阳市", 125_000.0);
        m.put("渭南市", 98_000.0);
        m.put("延安市", 77_000.0);
        m.put("汉中市", 91_000.0);
        m.put("榆林市", 325_000.0);
        m.put("安康市", 50_000.0);
        m.put("商洛市", 42_000.0);
        return m;
    }

    public static java.util.Map<String, Double> cityWeights() {
        java.util.Map<String, Double> totals = cityOrderTotals();
        double sum = totals.values().stream().mapToDouble(Double::doubleValue).sum();
        if (sum <= 0) {
            sum = 1;
        }
        java.util.Map<String, Double> out = new java.util.LinkedHashMap<>();
        for (var e : totals.entrySet()) {
            out.put(e.getKey(), e.getValue() / sum);
        }
        return out;
    }
}
