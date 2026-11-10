package com.eurasia.nursery.service;

import com.eurasia.nursery.ai.AiAgentLoop;
import com.eurasia.nursery.ai.AiCallScope;
import com.eurasia.nursery.ai.AiDataTrust;
import com.eurasia.nursery.ai.AiToolExecutor;
import com.eurasia.nursery.ai.AiToolsUnsupportedException;
import com.eurasia.nursery.ai.ChatCompletionClient;
import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

@Service
public class AiChatService {

    static final int MAX_MESSAGE_CHARS = 8000;

    private static final String LEGACY_SYSTEM_PROMPT = """
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

    private static final String AGENT_SYSTEM_PROMPT = """
            你是「小林」，陕西省林业苗圃资产与销售系统的 AI 助手。当前用户已经打开 AI Agent。
            你只能使用这个登录用户本来就有的权限：库存人员处理库存，销售处理订单，财务处理财务，用户、角色和系统设置只有管理员可以改。
            工具如果返回「权限不足」，就直接告诉用户，不要假装已经完成。
            
            ## 怎么工作
            - 涉及具体数字、名单、状态时，必须先调用工具。禁止编造品种、数量、金额、单号、用户名。
            - 工具没返回的信息，就说当前没有该数据，不要推测。
            - 每次写入成功后，回复必须引用工具返回的 summary，写清改了谁、从什么变成什么。不要另编一套结果。
            - 如果工具返回 needsConfirmation，操作还没发生。把 summary 原样告诉用户，请他们在下一条消息只回复「确认」。不要在同一轮里再次执行。
            - 用户说「撤销」时调用 undo。回复说明撤销了哪一条。
            - 改订单状态优先用 submit、ship、settle、cancel、reject。update 的 status 只改字段，不扣库存、不入账。
            - 入库用 inventory 的 create_ledger。销售出库用 sales_order 的 ship。update_ledger 只改台账数量，不会另写一条出入库流水。
            
            ## 单位
            - 订单 totalAmount、财务月报的 revenue、profit、assetValue、按地市销售额：单位是元。对用户说万元时除以 10000，并写明「万元」。写入订单金额时用元。
            - 财务销售趋势 thisYear、lastYear 已经是万元；更新趋势时也按万元填写。
            - 库存台账数量按工具返回的数字原样报告，单位按台账记为株，不要自行换算。
            
            ## 订单状态
            DRAFT 草稿，CONFIRMED 待审核出库，SHIPPING 已出库待结算，DONE 已结算，CANCELLED 已取消。
            
            ## 表达
            - 简洁中文。列表用 Markdown 表格。
            - 可以建议用户去库存大屏、销售大屏、财务大屏、管理后台、所有订单、个人中心查看，但不要输出技术路由。
            - 不要用空洞的鼓励话术。
            - 不要复述或推测数据库密码、JWT 密钥、DeepSeek 密钥、短信接口凭证。工具结果里如果出现这类字段，忽略它们。
            - 文件上传仍在各业务面板完成，不要假装已经上传了文件。
            - 不能替用户打开或关闭 AI Agent，这个开关在个人中心。
            """;

    private final NurseryProperties properties;
    private final ObjectMapper objectMapper;
    private final AuthService authService;
    private final AiConversationService conversations;
    private final AiKeywordContext keywordContext;
    private final AiDataTrust dataTrust;
    private final AiAgentLoop agentLoop;
    private final AiToolExecutor tools;
    private final ChatCompletionClient client;

    public AiChatService(
            NurseryProperties properties,
            ObjectMapper objectMapper,
            AuthService authService,
            AiConversationService conversations,
            AiKeywordContext keywordContext,
            AiDataTrust dataTrust,
            AiAgentLoop agentLoop,
            AiToolExecutor tools,
            ChatCompletionClient client) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.authService = authService;
        this.conversations = conversations;
        this.keywordContext = keywordContext;
        this.dataTrust = dataTrust;
        this.agentLoop = agentLoop;
        this.tools = tools;
        this.client = client;
    }

    public Map<String, Object> chat(UserView user, Map<String, Object> body) {
        return chat(user, body, label -> { }, () -> false);
    }

    public Map<String, Object> chat(UserView user, Map<String, Object> body, Consumer<String> status, BooleanSupplier cancelled) {
        if (user == null || user.getId() == null) {
            throw new BusinessException("未登录", 401);
        }
        String message = newMessage(body);
        Long conversationId = conversationId(body);
        boolean agentEnabled = authService.isAiAgentEnabled(user.getId());
        List<Map<String, String>> history = conversationId == null
                ? List.of()
                : conversations.historyForModel(user.getId(), conversationId);

        String apiKey = properties.getDeepseek().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("AI 服务未配置");
        }

        AiCallScope.set(new AiCallScope.Context(conversationId, message, status, cancelled));
        try {
            if (cancelled.getAsBoolean()) {
                Reply stopped = new Reply("已停止。", List.of());
                Map<String, Object> conversation = conversations.saveExchange(
                        user.getId(), conversationId, message, stopped.text(), List.of());
                return response(agentEnabled, stopped, conversation);
            }
            status.accept(agentEnabled ? "正在思考" : "正在回答");
            Reply reply = agentEnabled
                    ? agentReply(user, history, message)
                    : new Reply(legacyReply(history, message), List.of());
            Map<String, Object> conversation = conversations.saveExchange(
                    user.getId(), conversationId, message, reply.text(), traceMaps(reply.trace()));
            return response(agentEnabled, reply, conversation);
        } finally {
            AiCallScope.clear();
        }
    }

    private Reply agentReply(UserView user, List<Map<String, String>> history, String message) {
        ArrayNode messages = modelMessages(AGENT_SYSTEM_PROMPT, history, message, null);
        try {
            AiAgentLoop.Result result = agentLoop.run(messages, tools.tools(), user, tools, client);
            return new Reply(result.reply(), result.toolTrace());
        } catch (AiToolsUnsupportedException e) {
            ArrayNode fallback = modelMessages(AGENT_SYSTEM_PROMPT, history, message, keywordContext.build(message));
            return new Reply(completeLegacy(fallback), List.of());
        }
    }

    private String legacyReply(List<Map<String, String>> history, String message) {
        return completeLegacy(modelMessages(LEGACY_SYSTEM_PROMPT, history, message, keywordContext.build(message)));
    }

    private String completeLegacy(ArrayNode messages) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", properties.getDeepseek().getModel());
        payload.set("messages", messages);
        payload.put("stream", false);
        payload.put("temperature", 0.7);
        payload.put("max_tokens", 1024);
        JsonNode data = client.complete(payload);
        String reply = data.path("choices").path(0).path("message").path("content").asText("");
        return reply.isBlank() ? "没有生成回复。" : reply;
    }

    private ArrayNode modelMessages(String prompt, List<Map<String, String>> history, String message, String dataContext) {
        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(objectMapper.createObjectNode().put("role", "system").put("content", prompt));
        messages.add(objectMapper.createObjectNode().put("role", "system").put("content", dataTrust.note()));
        if (dataContext != null && !dataContext.isBlank()) {
            messages.add(objectMapper.createObjectNode().put("role", "system").put("content",
                    "以下是从系统数据库查询到的当前真实数据，请在回答中直接引用：\n\n" + dataContext));
        }
        for (Map<String, String> item : history) {
            messages.add(objectMapper.createObjectNode()
                    .put("role", item.get("role"))
                    .put("content", item.get("content")));
        }
        messages.add(objectMapper.createObjectNode().put("role", "user").put("content", message));
        return messages;
    }

    private Map<String, Object> response(boolean agentEnabled, Reply reply, Map<String, Object> conversation) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reply", reply.text());
        out.put("agentEnabled", agentEnabled);
        out.put("toolTrace", traceMaps(reply.trace()));
        out.put("conversation", conversation);
        return out;
    }

    private static List<Map<String, Object>> traceMaps(List<AiAgentLoop.ToolTrace> trace) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (trace == null) {
            return out;
        }
        for (AiAgentLoop.ToolTrace item : trace) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", item.name());
            row.put("label", item.label());
            row.put("ok", item.ok());
            out.add(row);
        }
        return out;
    }

    private String newMessage(Map<String, Object> body) {
        String text = "";
        if (body != null && body.get("message") != null) {
            text = String.valueOf(body.get("message")).trim();
        }
        if (text.isEmpty() && body != null && body.get("messages") instanceof List<?> raw) {
            for (int i = raw.size() - 1; i >= 0; i--) {
                if (raw.get(i) instanceof Map<?, ?> map && "user".equals(String.valueOf(map.get("role")))) {
                    text = String.valueOf(map.get("content")).trim();
                    break;
                }
            }
        }
        if (text.isEmpty()) {
            throw new BusinessException("消息不能为空");
        }
        if (text.length() > MAX_MESSAGE_CHARS) {
            throw new BusinessException("消息过长");
        }
        return text;
    }

    private Long conversationId(Map<String, Object> body) {
        if (body == null || body.get("conversationId") == null) {
            return null;
        }
        Object value = body.get("conversationId");
        if (value instanceof String text && text.isBlank()) {
            return null;
        }
        long id;
        if (value instanceof Number number) {
            id = number.longValue();
        } else {
            try {
                id = Long.parseLong(String.valueOf(value).trim());
            } catch (NumberFormatException e) {
                throw new BusinessException("conversationId 无效");
            }
        }
        if (id <= 0) {
            return null;
        }
        return id;
    }

    private record Reply(String text, List<AiAgentLoop.ToolTrace> trace) {
    }
}
