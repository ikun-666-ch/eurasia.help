package com.eurasia.nursery.ai;

import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.AiAuditMapper;
import com.eurasia.nursery.service.AiChatService;
import com.eurasia.nursery.service.AiConversationService;
import com.eurasia.nursery.service.AiKeywordContext;
import com.eurasia.nursery.service.AuthService;
import com.eurasia.nursery.service.DailyDataService;
import com.eurasia.nursery.service.InventoryService;
import com.eurasia.nursery.service.PageAccessService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiAssistantBehaviorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @AfterEach
    void clearScope() {
        AiCallScope.clear();
    }

    @Test
    void confirmationRequiresALaterExplicitYes() {
        AiConfirmationService confirmations = new AiConfirmationService();
        String first = confirmations.blockOrProceed(7L, "users", "delete", "删除用户 sales1", "删除用户 sales1");
        assertTrue(first.contains("尚未执行"));
        String sameTurn = confirmations.blockOrProceed(7L, "users", "delete", "删除用户 sales1", "删除用户 sales1");
        assertTrue(sameTurn.contains("尚未执行"));
        assertTrue(AiConfirmationService.isConfirmation("确认"));
        String allowed = confirmations.blockOrProceed(7L, "users", "delete", "删除用户 sales1", "确认");
        assertTrue(allowed == null);
    }

    @Test
    void salesUserCannotUpdateInventory() {
        InventoryService inventory = mock(InventoryService.class);
        when(inventory.listLedger()).thenReturn(List.of(ledger(1, 10)));
        AiToolCatalog catalog = catalog(inventory);
        UserView sales = user(3L, "SALES");

        AiToolExecutor.Execution result = catalog.execute("inventory",
                "{\"action\":\"update_ledger\",\"id\":1,\"quantity\":12}", sales);

        assertFalse(result.ok());
        assertTrue(result.content().contains("权限不足"));
        verify(inventory, never()).updateLedger(anyLong(), any());
    }

    @Test
    void largeInventoryChangeWaitsForConfirmation() {
        InventoryService inventory = mock(InventoryService.class);
        when(inventory.listLedger()).thenReturn(List.of(ledger(1, 20)));
        when(inventory.updateLedger(eq(1L), any())).thenReturn(ledger(1, 0));
        AiToolCatalog catalog = catalog(inventory);
        UserView inventoryUser = user(2L, "INVENTORY");

        AiToolExecutor.Execution pending = catalog.execute("inventory",
                "{\"action\":\"delete_ledger\",\"id\":1}", inventoryUser);
        assertTrue(pending.content().contains("needsConfirmation"));
        verify(inventory, never()).deleteLedger(anyLong());

        AiCallScope.set(new AiCallScope.Context(4L, "确认", label -> { }, () -> false));
        AiToolExecutor.Execution done = catalog.execute("inventory",
                "{\"action\":\"delete_ledger\",\"id\":1}", inventoryUser);
        assertTrue(done.ok());
        assertTrue(done.content().contains("删除台账"));
        verify(inventory).deleteLedger(1L);
    }

    @Test
    void agentSwitchOffIgnoresClientHistoryAndDoesNotSendTools() {
        List<ObjectNode> payloads = new ArrayList<>();
        ChatCompletionClient client = payload -> {
            payloads.add(payload.deepCopy());
            return assistant("根据注入数据回答");
        };
        AuthService auth = mock(AuthService.class);
        when(auth.isAiAgentEnabled(5L)).thenReturn(false);
        AiConversationService conversations = mock(AiConversationService.class);
        when(conversations.historyForModel(5L, 8L)).thenReturn(List.of(Map.of("role", "assistant", "content", "库存是 3")));
        when(conversations.saveExchange(eq(5L), eq(8L), any(), any(), any())).thenReturn(Map.of("id", 8L, "title", "库存"));
        AiKeywordContext keyword = mock(AiKeywordContext.class);
        when(keyword.build(any())).thenReturn("【库存数据】\n库存是 3");
        AiDataTrust trust = mock(AiDataTrust.class);
        when(trust.note()).thenReturn("截至测试时点");
        AiToolExecutor tools = mock(AiToolExecutor.class);
        when(tools.tools()).thenReturn(List.of());

        AiChatService service = new AiChatService(properties(), objectMapper, auth, conversations, keyword, trust,
                new AiAgentLoop(objectMapper, properties()), tools, client);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("conversationId", 8);
        body.put("message", "现在库存多少");
        body.put("agentEnabled", true);
        body.put("messages", List.of(Map.of("role", "assistant", "content", "库存是 999")));

        Map<String, Object> response = service.chat(user(5L, "SALES"), body);

        assertFalse((Boolean) response.get("agentEnabled"));
        String sent = payloads.get(0).toString();
        assertFalse(sent.contains("\"tools\""));
        assertTrue(sent.contains("库存是 3"));
        assertFalse(sent.contains("库存是 999"));
        assertTrue(sent.contains("截至测试时点"));
        verify(tools, never()).execute(any(), any(), any());
    }

    @Test
    void agentSwitchOnSendsToolsAndUsesStoredHistory() {
        List<ObjectNode> payloads = new ArrayList<>();
        ChatCompletionClient client = payload -> {
            payloads.add(payload.deepCopy());
            return assistant("台账里是 3");
        };
        AuthService auth = mock(AuthService.class);
        when(auth.isAiAgentEnabled(5L)).thenReturn(true);
        AiConversationService conversations = mock(AiConversationService.class);
        when(conversations.historyForModel(5L, 8L)).thenReturn(List.of(Map.of("role", "user", "content", "昨天问过库存")));
        when(conversations.saveExchange(eq(5L), eq(8L), any(), any(), any())).thenReturn(Map.of("id", 8L, "title", "库存"));
        AiKeywordContext keyword = mock(AiKeywordContext.class);
        AiDataTrust trust = mock(AiDataTrust.class);
        when(trust.note()).thenReturn("截至测试时点");
        AiTool tool = new AiTool("inventory", "库存", AiSchemas.object(objectMapper), Map.of(), (user, args) -> Map.of());
        AiToolExecutor tools = mock(AiToolExecutor.class);
        when(tools.tools()).thenReturn(List.of(tool));

        AiChatService service = new AiChatService(properties(), objectMapper, auth, conversations, keyword, trust,
                new AiAgentLoop(objectMapper, properties()), tools, client);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("conversationId", 8L);
        body.put("message", "再查一次");
        body.put("messages", List.of(Map.of("role", "assistant", "content", "库存是 999")));

        Map<String, Object> response = service.chat(user(5L, "SALES"), body);

        assertTrue((Boolean) response.get("agentEnabled"));
        String sent = payloads.get(0).toString();
        assertTrue(sent.contains("\"tools\""));
        assertTrue(sent.contains("昨天问过库存"));
        assertFalse(sent.contains("库存是 999"));
        verify(keyword, never()).build(any());
    }

    @Test
    void trustNoteMentionsAutofillAndTime() {
        DailyDataService daily = mock(DailyDataService.class);
        when(daily.isAutoFillEnabled()).thenReturn(true);
        String note = new AiDataTrust(daily).note();
        assertTrue(note.contains("自动填数当前是开启的"));
        assertTrue(note.contains("北京时间"));
        assertTrue(note.contains("演示数据"));
    }

    private AiToolCatalog catalog(InventoryService inventory) {
        AiWrites writes = new AiWrites(new AiConfirmationService(), auditMapper(), objectMapper);
        InventoryAiTools tools = new InventoryAiTools(inventory, objectMapper,
                new AiAccess(new PageAccessService(objectMapper)), writes);
        return new AiToolCatalog(objectMapper, List.of(tools.tool()));
    }

    private AiAuditMapper auditMapper() {
        AiAuditMapper audit = mock(AiAuditMapper.class);
        when(audit.lastInsertId()).thenReturn(9L);
        return audit;
    }

    private static Map<String, Object> ledger(int id, double quantity) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("variety", "油松");
        row.put("specification", "2年");
        row.put("quantity", quantity);
        row.put("city", "西安市");
        return row;
    }

    private static UserView user(long id, String role) {
        UserView user = new UserView();
        user.setId(id);
        user.setUsername(role.toLowerCase());
        user.setRoleCode(role);
        user.setExtraPageAccess("[]");
        return user;
    }

    private NurseryProperties properties() {
        NurseryProperties properties = new NurseryProperties();
        properties.getDeepseek().setApiKey("test-key");
        properties.getDeepseek().setModel("deepseek-chat");
        return properties;
    }

    private JsonNode assistant(String content) {
        ObjectNode message = objectMapper.createObjectNode();
        message.put("role", "assistant");
        message.put("content", content);
        ObjectNode choice = objectMapper.createObjectNode();
        choice.set("message", message);
        ArrayNode choices = objectMapper.createArrayNode().add(choice);
        ObjectNode root = objectMapper.createObjectNode();
        root.set("choices", choices);
        return root;
    }
}
