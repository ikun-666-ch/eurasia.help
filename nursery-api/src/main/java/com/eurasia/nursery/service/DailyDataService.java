package com.eurasia.nursery.service;

import com.eurasia.nursery.mapper.DailyMetricMapper;
import com.eurasia.nursery.mapper.SystemSettingsMapper;
import com.eurasia.nursery.support.DemoMetrics;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 对齐 PHP DailyDataSchema（系统设置 + 自动填数） */
@Service
public class DailyDataService {

    public static final String SERIES_SAL_ORDER = "sal.order";
    public static final String SERIES_FIN_THIS = "fin.revenue.this";
    public static final String SERIES_FIN_LAST = "fin.revenue.last";
    public static final String SERIES_INV_STOCK = "inv.stock";
    public static final String SERIES_INV_INBOUND = "inv.inbound";
    public static final String SERIES_INV_OUTBOUND = "inv.outbound";
    public static final int FORECAST_DAYS = 10;
    public static final int HISTORY_DAYS = 30;

    private static final double[] SAL_TEMPLATE_WAN = {
            8.2, 8.5, 8.1, 8.8, 9.0, 8.6, 9.2, 9.5, 9.1, 9.8,
            10.0, 9.6, 10.2, 10.5, 10.1, 10.8, 11.0, 10.6, 11.2, 11.5,
            11.1, 11.8, 12.0, 11.6, 12.2, 12.5, 12.1, 12.8, 13.0, 12.6
    };
    private static final double[] FIN_THIS = {1.28, 1.30, 1.32, 1.34, 1.36, 1.38, 1.40, 1.42, 1.44, 1.45};
    private static final double[] FIN_LAST = {1.08, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18};

    private final SystemSettingsMapper systemSettingsMapper;
    private final DailyMetricMapper dailyMetricMapper;

    public DailyDataService(SystemSettingsMapper systemSettingsMapper, DailyMetricMapper dailyMetricMapper) {
        this.systemSettingsMapper = systemSettingsMapper;
        this.dailyMetricMapper = dailyMetricMapper;
    }

    public Map<String, Object> getSettings() {
        Map<String, Object> row = systemSettingsMapper.getSettings();
        Map<String, Object> out = new LinkedHashMap<>();
        if (row == null) {
            out.put("autoFillEnabled", false);
            out.put("lastAutoFillDate", null);
            return out;
        }
        out.put("autoFillEnabled", toBool(row.get("autoFillEnabled")));
        out.put("lastAutoFillDate", formatDateValue(row.get("lastAutoFillDate")));
        return out;
    }

    public boolean isAutoFillEnabled() {
        Map<String, Object> row = systemSettingsMapper.getSettings();
        return row != null && toBool(row.get("autoFillEnabled"));
    }

    public Map<String, Object> setAutoFillEnabled(boolean enabled) {
        systemSettingsMapper.setAutoFillEnabled(enabled ? 1 : 0);
        if (enabled) {
            fillPendingThroughToday();
        }
        return getSettings();
    }

    public void fillPendingThroughToday() {
        if (!isAutoFillEnabled()) {
            return;
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        Map<String, Object> settings = getSettings();
        Object lastObj = settings.get("lastAutoFillDate");
        LocalDate cursor;
        if (lastObj == null || lastObj.toString().isBlank()) {
            cursor = launchDate();
        } else {
            cursor = toLocalDate(lastObj).plusDays(1);
        }
        while (!cursor.isAfter(today)) {
            generateForDate(cursor.toString(), true);
            cursor = cursor.plusDays(1);
        }
        systemSettingsMapper.setLastAutoFillDate(today.toString());
        for (int i = 0; i < FORECAST_DAYS; i++) {
            generateForDate(today.plusDays(i).toString(), true);
        }
    }

    public void generateForDate(String isoDate, boolean includeSal) {
        if (dayIndexSinceLaunch(isoDate) < 0) {
            return;
        }
        LocalDate date = LocalDate.parse(isoDate);
        // 对齐 PHP DateTime::format('Yz')：4 位年 + 0 起算年内天数（Java 的 D 为 1 起算）
        int seed = date.getYear() * 1000 + (date.getDayOfYear() - 1);
        double growth = growthFactorSinceLaunch(isoDate);
        int dayIdx = dayIndexSinceLaunch(isoDate);
        Map<String, Double> cityWeights = DemoMetrics.cityWeights();
        Map<String, Double> stockByCity = stockLevelsForDate(isoDate, growth);
        double daySalesYuan = dailyMetricMapper.salesYuanOnDate(isoDate).doubleValue();

        int tplIdx = dayIdx >= 0 ? dayIdx % SAL_TEMPLATE_WAN.length : 0;
        double provSalWan = SAL_TEMPLATE_WAN[tplIdx] * (0.04 + 0.96 * growth);

        for (var e : cityWeights.entrySet()) {
            String city = e.getKey();
            double w = e.getValue();
            if (includeSal && growth > 0) {
                double wan = round4(provSalWan * w * (1 + ((seed + city.hashCode()) % 5 - 2) * 0.008));
                dailyMetricMapper.upsert(SERIES_SAL_ORDER, isoDate, city, BigDecimal.valueOf(wan));
            }
            double stock = stockByCity.getOrDefault(city, 0.0);
            dailyMetricMapper.upsert(SERIES_INV_STOCK, isoDate, city, BigDecimal.valueOf(stock));
        }

        int fIdx = tplIdx % FIN_THIS.length;
        double finScale = growth <= 0 ? 0.0 : (0.2 + 0.8 * growth);
        for (var e : cityWeights.entrySet()) {
            String city = e.getKey();
            double w = e.getValue();
            dailyMetricMapper.upsert(SERIES_FIN_THIS, isoDate, city,
                    BigDecimal.valueOf(round2(FIN_THIS[fIdx] * w * 10000 * finScale)));
            dailyMetricMapper.upsert(SERIES_FIN_LAST, isoDate, city,
                    BigDecimal.valueOf(round2(FIN_LAST[fIdx] * w * 10000 * finScale)));
        }

        double ioScale = growth <= 0 ? 0.0 : (0.15 + 0.85 * growth);
        double outbound = round2(DemoMetrics.salesYuanToStockWanZhu(daySalesYuan));
        if (outbound <= 0 && ioScale > 0) {
            outbound = round2(0.08 + (seed % 7) * 0.02);
        }
        double inbound = round2(outbound * (0.85 + (seed % 15) / 100.0));
        for (var e : cityWeights.entrySet()) {
            String c = e.getKey();
            double w = e.getValue();
            double cIn = Math.max(0, round2(inbound * w * (0.95 + ((seed + c.hashCode()) % 11) * 0.01)));
            double cOut = Math.max(0, round2(outbound * w * (0.95 + ((seed + c.hashCode() + 7) % 11) * 0.01)));
            dailyMetricMapper.upsert(SERIES_INV_INBOUND, isoDate, c, BigDecimal.valueOf(cIn));
            dailyMetricMapper.upsert(SERIES_INV_OUTBOUND, isoDate, c, BigDecimal.valueOf(cOut));
        }
        // keep province-level aggregate for backward compat
        dailyMetricMapper.upsert(SERIES_INV_INBOUND, isoDate, "", BigDecimal.valueOf(inbound));
        dailyMetricMapper.upsert(SERIES_INV_OUTBOUND, isoDate, "", BigDecimal.valueOf(outbound));
    }

    public Map<String, Object> invStockTrend(String city) {
        maybeAutoFill();
        List<String> dates = datesSinceLaunch();
        if (dates.isEmpty()) {
            dates = pastDates(HISTORY_DAYS);
        }
        List<String> labels = toMdLabels(dates);
        List<Double> values;
        boolean complete;
        if (city != null && !city.isBlank()) {
            List<Double> raw = loadSeries(SERIES_INV_STOCK, dates, city);
            complete = seriesComplete(raw);
            values = complete ? raw : List.of();
        } else {
            List<Double> raw = new ArrayList<>();
            for (String date : dates) {
                double sum = 0;
                boolean ok = true;
                for (String c : DemoMetrics.cityWeights().keySet()) {
                    Double v = loadPoint(SERIES_INV_STOCK, date, c);
                    if (v == null) {
                        ok = false;
                        break;
                    }
                    sum += v;
                }
                raw.add(ok ? round2(sum) : null);
            }
            complete = seriesComplete(raw);
            values = complete ? raw.stream().map(d -> d).toList() : List.of();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("labels", labels);
        out.put("values", values);
        out.put("manualRequired", !complete);
        out.put("autoFillEnabled", isAutoFillEnabled());
        out.put("city", city);
        return out;
    }

    public Map<String, Object> invIoTrend(String city) {
        maybeAutoFill();
        List<String> dates = datesSinceLaunch();
        if (dates.isEmpty()) {
            dates = pastDates(HISTORY_DAYS);
        }
        List<Double> inRaw = loadSeries(SERIES_INV_INBOUND, dates, city != null && !city.isBlank() ? city : "");
        List<Double> outRaw = loadSeries(SERIES_INV_OUTBOUND, dates, city != null && !city.isBlank() ? city : "");
        boolean complete = seriesComplete(inRaw) && seriesComplete(outRaw);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("labels", toMdLabels(dates));
        result.put("inbound", complete ? inRaw : List.of());
        result.put("outbound", complete ? outRaw : List.of());
        result.put("manualRequired", !complete);
        result.put("autoFillEnabled", isAutoFillEnabled());
        return result;
    }

    public Map<String, Object> salOrderTrend(String city) {
        maybeAutoFill();
        List<String> dates = datesSinceLaunch();
        if (dates.isEmpty()) {
            dates = pastDates(HISTORY_DAYS);
        }
        List<Double> raw;
        if (city != null && !city.isBlank()) {
            raw = loadSeries(SERIES_SAL_ORDER, dates, city);
        } else {
            raw = aggregateProvinceSeries(SERIES_SAL_ORDER, dates);
        }
        boolean complete = seriesComplete(raw);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("labels", toMdLabels(dates));
        out.put("amounts", complete ? raw : List.of());
        out.put("manualRequired", !complete);
        out.put("autoFillEnabled", isAutoFillEnabled());
        return out;
    }

    public Map<String, Object> finSalesTrend(String city) {
        maybeAutoFill();
        List<String> dates = futureDates(FORECAST_DAYS);
        List<Double> thisRaw;
        List<Double> lastRaw;
        if (city != null && !city.isBlank()) {
            thisRaw = loadSeries(SERIES_FIN_THIS, dates, city);
            lastRaw = loadSeries(SERIES_FIN_LAST, dates, city);
        } else {
            thisRaw = aggregateProvinceSeries(SERIES_FIN_THIS, dates);
            lastRaw = aggregateProvinceSeries(SERIES_FIN_LAST, dates);
        }
        boolean complete = seriesComplete(thisRaw) && seriesComplete(lastRaw);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("labels", toMdLabels(dates));
        out.put("thisYear", complete ? thisRaw.stream().map(v -> round2(v / 10000)).toList() : List.of());
        out.put("lastYear", complete ? lastRaw.stream().map(v -> round2(v / 10000)).toList() : List.of());
        out.put("manualRequired", !complete);
        out.put("autoFillEnabled", isAutoFillEnabled());
        return out;
    }

    public void saveFinTrendManual(String city, List<?> thisYear, List<?> lastYear) {
        List<String> dates = futureDates(FORECAST_DAYS);
        int len = Math.min(Math.max(thisYear.size(), lastYear.size()), FORECAST_DAYS);
        for (int i = 0; i < len; i++) {
            double thisWan = i < thisYear.size() ? toDouble(thisYear.get(i)) : 0;
            double lastWan = i < lastYear.size() ? toDouble(lastYear.get(i)) : 0;
            dailyMetricMapper.upsertManual(SERIES_FIN_THIS, dates.get(i), city, BigDecimal.valueOf(thisWan * 10000));
            dailyMetricMapper.upsertManual(SERIES_FIN_LAST, dates.get(i), city, BigDecimal.valueOf(lastWan * 10000));
        }
    }

    public static List<String> futureDates(int days) {
        LocalDate start = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        List<String> out = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            out.add(start.plusDays(i).toString());
        }
        return out;
    }

    private static double toDouble(Object v) {
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return 0;
        }
    }

    private List<Double> aggregateProvinceSeries(String key, List<String> dates) {
        List<Double> raw = new ArrayList<>();
        for (String date : dates) {
            double sum = 0;
            boolean ok = true;
            for (String c : DemoMetrics.cityWeights().keySet()) {
                Double v = loadPoint(key, date, c);
                if (v == null) {
                    ok = false;
                    break;
                }
                sum += v;
            }
            raw.add(ok ? round4(sum) : null);
        }
        return raw;
    }

    public static List<String> datesSinceLaunch() {
        LocalDate end = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        LocalDate launch = launchDate();
        if (end.isBefore(launch)) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        LocalDate cursor = launch;
        while (!cursor.isAfter(end)) {
            out.add(cursor.toString());
            cursor = cursor.plusDays(1);
        }
        return out;
    }

    public static List<String> pastDates(int days) {
        LocalDate end = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        List<String> out = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            out.add(end.minusDays(i).toString());
        }
        return out;
    }

    public static List<String> toMdLabels(List<String> isoDates) {
        DateTimeFormatter md = DateTimeFormatter.ofPattern("MM-dd");
        return isoDates.stream().map(d -> LocalDate.parse(d).format(md)).toList();
    }

    private void maybeAutoFill() {
        if (isAutoFillEnabled()) {
            fillPendingThroughToday();
        }
    }

    private List<Double> loadSeries(String key, List<String> dates, String city) {
        List<Double> out = new ArrayList<>();
        for (String date : dates) {
            out.add(loadPoint(key, date, city));
        }
        return out;
    }

    private Double loadPoint(String key, String date, String city) {
        String cityKey = city == null ? "" : city;
        Map<String, Object> row = dailyMetricMapper.loadPoint(key, date, cityKey);
        if (row == null) {
            return null;
        }
        if (!isAutoFillEnabled() && !"manual".equals(String.valueOf(row.get("source")))) {
            return null;
        }
        return ((Number) row.get("amount")).doubleValue();
    }

    private static boolean seriesComplete(List<Double> values) {
        if (values.isEmpty()) {
            return false;
        }
        for (Double v : values) {
            if (v == null) {
                return false;
            }
        }
        return true;
    }

    public static LocalDate launchDate() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        LocalDate launch = LocalDate.of(today.getYear(), 5, 1);
        if (today.isBefore(launch)) {
            launch = launch.minusYears(1);
        }
        return launch;
    }

    public static int dayIndexSinceLaunch(String isoDate) {
        LocalDate launch = launchDate();
        LocalDate date = LocalDate.parse(isoDate);
        if (date.isBefore(launch)) {
            return -1;
        }
        return (int) (date.toEpochDay() - launch.toEpochDay());
    }

    public static double growthFactorSinceLaunch(String isoDate) {
        int idx = dayIndexSinceLaunch(isoDate);
        if (idx < 0) {
            return 0.0;
        }
        if (idx == 0) {
            return 0.0;
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        long totalDays = Math.max(1, today.toEpochDay() - launchDate().toEpochDay());
        return Math.min(1.0, idx / (double) totalDays);
    }

    private Map<String, Double> stockLevelsForDate(String isoDate, double growth) {
        Map<String, java.util.Map<String, Object>> raw = dailyMetricMapper.stockByCity();
        Map<String, Double> byCity = new LinkedHashMap<>();
        double launchTotal = 0;
        for (var e : raw.entrySet()) {
            String city = e.getKey();
            if (city == null || city.isBlank()) {
                continue;
            }
            Object qtyObj = e.getValue().get("qty");
            double qty = qtyObj instanceof Number n ? n.doubleValue() : 0;
            byCity.put(city, qty);
            launchTotal += qty;
        }
        if (launchTotal <= 0) {
            launchTotal = DemoMetrics.PROVINCE_STOCK_WANZHU;
        }
        if (growth <= 0) {
            return byCity;
        }
        double soldWanZhu = DemoMetrics.salesYuanToStockWanZhu(
                dailyMetricMapper.cumulativeSalesYuan(isoDate).doubleValue());
        double endTotal = Math.max(launchTotal * DemoMetrics.MIN_STOCK_RATIO, launchTotal - soldWanZhu);
        if (soldWanZhu <= 0) {
            endTotal = launchTotal - (launchTotal - launchTotal * DemoMetrics.MIN_STOCK_RATIO) * growth;
        }
        double ratio = endTotal / launchTotal;
        Map<String, Double> out = new LinkedHashMap<>();
        for (var e : byCity.entrySet()) {
            out.put(e.getKey(), round2(e.getValue() * ratio));
        }
        return out;
    }

    private static String formatDateValue(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof java.sql.Date sd) {
            return sd.toLocalDate().toString();
        }
        if (v instanceof LocalDate ld) {
            return ld.toString();
        }
        String s = String.valueOf(v);
        return s.length() >= 10 ? s.substring(0, 10) : s;
    }

    private static LocalDate toLocalDate(Object v) {
        if (v instanceof LocalDate ld) {
            return ld;
        }
        if (v instanceof java.sql.Date sd) {
            return sd.toLocalDate();
        }
        return LocalDate.parse(String.valueOf(v).substring(0, 10));
    }

    private static boolean toBool(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof Number n) {
            return n.intValue() != 0;
        }
        return false;
    }

    private static double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private static double round4(double v) {
        return BigDecimal.valueOf(v).setScale(4, RoundingMode.HALF_UP).doubleValue();
    }
}
