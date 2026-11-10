package com.eurasia.nursery.ai;

import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.FinanceService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class FinanceAiTools {

    private final FinanceService financeService;
    private final ObjectMapper objectMapper;
    private final AiAccess access;
    private final AiWrites writes;

    public FinanceAiTools(FinanceService financeService, ObjectMapper objectMapper, AiAccess access, AiWrites writes) {
        this.financeService = financeService;
        this.objectMapper = objectMapper;
        this.access = access;
        this.writes = writes;
    }

    public List<AiTool> tools() {
        return List.of(queryTool(), updateTool());
    }

    private AiTool queryTool() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "summary 月报与资产，金额是元；sales_trend 销售趋势，数值已是万元；asset_stats 资产统计；sales_by_city、sales_by_district 销售额是元。",
                "summary", "sales_trend", "asset_stats", "sales_by_city", "sales_by_district");
        AiSchemas.prop(objectMapper, schema, "city", "string", "地市。sales_by_district 必填");
        AiSchemas.require(objectMapper, schema, "action");
        Map<String, String> labels = Map.of(
                "summary", "查询财务汇总",
                "sales_trend", "查询财务销售趋势",
                "asset_stats", "查询资产统计",
                "sales_by_city", "查询地市收入",
                "sales_by_district", "查询区县收入"
        );
        return new AiTool("finance_query", "查询财务汇总、趋势和资产。summary 的金额是元；sales_trend 已换算成万元。", schema, labels, this::query);
    }

    private AiTool updateTool() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "settings 增长率和季度占比；sales_trend 按万元写入；asset_stats 覆盖该地市资产条目；month 按元写入月报；asset_value 按元更新最新资产估值。",
                "settings", "sales_trend", "asset_stats", "month", "asset_value");
        AiSchemas.prop(objectMapper, schema, "city", "string", "地市");
        AiSchemas.arrayProp(objectMapper, schema, "growthRates", "settings：[累计增长率, 同比增长率]");
        AiSchemas.arrayProp(objectMapper, schema, "pieItems", "settings：[{name:Q1,value},{name:Q2,value}...]");
        AiSchemas.prop(objectMapper, schema, "assetValue", "number", "资产估值，单位元");
        AiSchemas.arrayProp(objectMapper, schema, "thisYear", "sales_trend 今年序列，单位万元");
        AiSchemas.arrayProp(objectMapper, schema, "lastYear", "sales_trend 去年序列，单位万元");
        AiSchemas.arrayProp(objectMapper, schema, "items", "asset_stats 条目：label,value,label2,value2,unit");
        AiSchemas.prop(objectMapper, schema, "yearMonth", "string", "月份，如 2026-04");
        AiSchemas.prop(objectMapper, schema, "revenue", "number", "月收入，单位元");
        AiSchemas.prop(objectMapper, schema, "profit", "number", "月利润，单位元");
        AiSchemas.require(objectMapper, schema, "action");
        Map<String, String> labels = Map.of(
                "settings", "更新财务设置",
                "sales_trend", "更新财务销售趋势",
                "asset_stats", "更新资产统计",
                "month", "更新财务月报",
                "asset_value", "更新资产估值"
        );
        return new AiTool("finance_update", "修改财务设置、趋势、资产和月报。月报金额用元，销售趋势用万元。", schema, labels, this::update);
    }

    private Map<String, Object> previousMonth(Map<String, Object> body) {
        Map<String, Object> summary = financeService.summary(null);
        Map<String, Object> before = new java.util.LinkedHashMap<>();
        before.put("yearMonth", body.get("yearMonth"));
        Object months = summary.get("months");
        Object revenue = summary.get("revenue");
        Object profit = summary.get("profit");
        if (months instanceof List<?> monthList && revenue instanceof List<?> revenueList && profit instanceof List<?> profitList) {
            for (int i = 0; i < monthList.size(); i++) {
                if (String.valueOf(monthList.get(i)).equals(String.valueOf(body.get("yearMonth")))) {
                    before.put("revenue", i < revenueList.size() ? revenueList.get(i) : 0);
                    before.put("profit", i < profitList.size() ? profitList.get(i) : 0);
                    return before;
                }
            }
        }
        before.put("revenue", 0);
        before.put("profit", 0);
        return before;
    }

    private Object query(UserView caller, JsonNode args) {
        access.requireAnyPage(caller, "fin");
        String city = AiArgs.blankToNull(AiArgs.text(args, "city"));
        return switch (AiArgs.action(args)) {
            case "summary" -> financeService.summary(city);
            case "sales_trend" -> financeService.salesTrend(city);
            case "asset_stats" -> financeService.assetStats(city);
            case "sales_by_city" -> financeService.salesByCity();
            case "sales_by_district" -> financeService.salesByDistrict(city);
            default -> AiResults.unknownAction("summary", "sales_trend", "asset_stats", "sales_by_city", "sales_by_district");
        };
    }

    private Object update(UserView caller, JsonNode args) {
        access.requireAnyPage(caller, "fin");
        String action = AiArgs.action(args);
        return switch (action) {
            case "settings" -> {
                Map<String, Object> current = financeService.summary(null);
                Map<String, Object> before = new java.util.LinkedHashMap<>();
                before.put("growthRates", current.get("growthRates"));
                before.put("pieItems", current.get("pieItems"));
                if (AiArgs.present(args, "assetValue")) {
                    before.put("assetValue", current.get("assetValue"));
                }
                yield writes.run(caller, "finance_update", action, "更新财务设置", before, false, true,
                        () -> financeService.updateSettings(caller, AiArgs.pick(objectMapper, args, "growthRates", "pieItems", "assetValue"),
                                AiArgs.blankToNull(AiArgs.text(args, "city"))));
            }
            case "sales_trend" -> writes.run(caller, "finance_update", action, "更新财务销售趋势 " + AiArgs.text(args, "city"),
                    null, false, false, () -> financeService.updateSalesTrend(caller, AiArgs.pick(objectMapper, args, "city", "thisYear", "lastYear")));
            case "asset_stats" -> writes.run(caller, "finance_update", action, "更新资产统计 " + AiArgs.text(args, "city"),
                    null, false, false, () -> financeService.updateAssetStats(caller, AiArgs.pick(objectMapper, args, "city", "items")));
            case "month" -> {
                Map<String, Object> body = AiArgs.pick(objectMapper, args, "yearMonth", "revenue", "profit", "assetValue");
                String summary = "把 " + body.get("yearMonth") + " 的月报改为收入 " + body.get("revenue") + " 元、利润 " + body.get("profit") + " 元";
                yield writes.run(caller, "finance_update", "month", summary, previousMonth(body), false, true,
                        () -> financeService.updateMonth(caller, body));
            }
            case "asset_value" -> writes.run(caller, "finance_update", action,
                    "把最新资产估值改为 " + AiArgs.text(args, "assetValue") + " 元", null, false, false,
                    () -> financeService.updateAssetValue(caller, AiArgs.pick(objectMapper, args, "assetValue")));
            default -> AiResults.unknownAction("settings", "sales_trend", "asset_stats", "month", "asset_value");
        };
    }
}
