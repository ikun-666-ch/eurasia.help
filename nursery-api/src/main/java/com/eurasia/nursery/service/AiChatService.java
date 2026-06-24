package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.mapper.AiDataContextMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 对齐 PHP chatAi + buildDataContext */
@Service
public class AiChatService {

    private static final String SYSTEM_PROMPT = """
            你是「小林」——陕西省林业苗圃资产与销售系统的 AI 智能助手。你有权限查询系统数据库，可以直接告诉用户真实数据。
            
            ---
            
            ## 角色定位
            你是一名务实、高效的苗圃业务助手。你可以查询系统内的库存、销售、财务等真实业务数据，
            直接给出数据驱动的回答。沟通风格直接、基于事实，按需给出状态信息，不啰嗦、不灌鸡汤。
            
            ## 核心原则
            1. 清晰（Clarity）：每次回答都要具体、可验证。给出实际数据而非模糊描述。
            2. 务实（Pragmatism）：以解决问题、推进业务为首要目标。能查到数据就直接报，不需要数据就简洁回答。
            3. 严谨（Rigor）：数据和业务逻辑的推理要有依据。不确定时说明，不编造。
            
            ## 数据能力
            你拥有系统数据库的查询权限。每次对话开始时会自动注入相关真实数据到上下文，你直接引用即可。
            【关键】答案中的数据必须来自于注入的真实数据，严禁编造任何品种名、数量、金额。
            - 库存数据：各品类/SKU 的当前库存量、库存趋势、出入库记录
            - 销售数据：订单汇总、销售额、各城市/区县销售分布、月度趋势
            - 财务数据：收入汇总、资产估值、成本分析
            - 用户与配置：系统设置、用户信息（需管理员权限）
            
            ## 业务模块
            系统包含以下功能面板：
            - 库存大屏：苗木入库/出库、库存台账、库存趋势、品类管理
            - 销售大屏：销售订单管理、城市分布、销售趋势、物流追踪
            - 财务大屏：收入汇总、月度趋势、城市维度分析、资产统计
            - 管理后台：用户管理、角色权限、品类/SKU 配置、系统设置
            - 所有订单：订单总览表格，支持编辑和筛选
            - 个人中心：个人信息、密码、手机号修改
            
            ## 交互风格
            - 用简洁的中文。直接给结论、数据、操作建议。
            - 展示列表/结构化数据时，使用 Markdown 表格（| 列1 | 列2 |），不要用纯文本横线列表。
            - 有数据时直接展示具体数值，不要只说"请去某某面板查看"。
            - 不要使用 cheerleading 话术（如"太棒了""非常优秀""相信你一定能"）。
            - 可以建议用户进入具体面板操作，但要说明【面板名称】而非技术路径。
            - 面板名称示例：库存大屏、销售大屏、财务大屏、管理后台、所有订单、个人中心。
            - 永远不要输出 / # / inv / sal / fin 等技术路由路径。
            
            ## 边界与升级
            - 遇到不确定的问题，诚实说"我不确定"，并建议用户进入相关面板或联系管理员。
            - 如果用户的问题超出本系统范围，友好引导回业务范围。
            - 涉及删除、权限变更等敏感操作，提醒用户确认。
            
            ## 注意事项
            - 【重要】只使用【系统注入的真实数据】回答问题。禁止编造任何具体数字、品种名、金额。
            - 如果注入数据中没有某项信息，直接说"当前没有该维度数据"，不要推测。
            - 保持专业但不冷漠——你是用户的业务伙伴。
            """;

    private final NurseryProperties properties;
    private final AiDataContextMapper aiDataContextMapper;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public AiChatService(NurseryProperties properties, AiDataContextMapper aiDataContextMapper,
                         ObjectMapper objectMapper) {
        this.properties = properties;
        this.aiDataContextMapper = aiDataContextMapper;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> chat(Map<String, Object> body) {
        Object messagesObj = body.get("messages");
        if (!(messagesObj instanceof List<?> rawMessages) || rawMessages.isEmpty()) {
            throw new BusinessException("消息不能为空");
        }

        NurseryProperties.DeepSeek deepSeek = properties.getDeepseek();
        String apiKey = deepSeek.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("AI 服务未配置");
        }

        String lastUserMsg = extractLastUserMessage(rawMessages);
        String dataContext = buildDataContext(lastUserMsg);

        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(objectMapper.createObjectNode().put("role", "system").put("content", SYSTEM_PROMPT));
        if (!dataContext.isBlank()) {
            messages.add(objectMapper.createObjectNode().put("role", "system").put("content",
                    "以下是从系统数据库查询到的当前真实数据，请在回答中直接引用：\n\n" + dataContext));
        }
        for (Object item : rawMessages) {
            if (item instanceof Map<?, ?> map) {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("role", String.valueOf(map.get("role")));
                node.put("content", String.valueOf(map.get("content")));
                messages.add(node);
            }
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", deepSeek.getModel());
        payload.set("messages", messages);
        payload.put("stream", false);
        payload.put("temperature", 0.7);
        payload.put("max_tokens", 1024);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(deepSeek.getApiUrl()))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode data = objectMapper.readTree(response.body());
            if (response.statusCode() != 200 || data.has("error")) {
                String errMsg = data.path("error").path("message").asText("HTTP " + response.statusCode());
                throw new BusinessException("AI 返回错误：" + errMsg);
            }
            String reply = data.path("choices").path(0).path("message").path("content").asText("");
            return Map.of("reply", reply);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("AI 服务请求失败：" + e.getMessage());
        }
    }

    private String extractLastUserMessage(List<?> messages) {
        for (int i = messages.size() - 1; i >= 0; i--) {
            Object item = messages.get(i);
            if (item instanceof Map<?, ?> map && "user".equals(String.valueOf(map.get("role")))) {
                return String.valueOf(map.get("content"));
            }
        }
        return "";
    }

    private String buildDataContext(String userMsg) {
        String lower = userMsg.toLowerCase(Locale.ROOT);
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
