package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.AiChatService;
import com.eurasia.nursery.service.AiConversationService;
import com.eurasia.nursery.web.RequestUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final AiChatService aiChatService;
    private final AiConversationService conversations;
    private final ObjectMapper objectMapper;
    private final ExecutorService aiChatExecutor;

    public AiController(AiChatService aiChatService, AiConversationService conversations,
                        ObjectMapper objectMapper, ExecutorService aiChatExecutor) {
        this.aiChatService = aiChatService;
        this.conversations = conversations;
        this.objectMapper = objectMapper;
        this.aiChatExecutor = aiChatExecutor;
    }

    @GetMapping("/conversations")
    public ApiResponse<List<Map<String, Object>>> list(HttpServletRequest request,
                                                       @RequestParam(required = false) String q,
                                                       @RequestParam(required = false, defaultValue = "false") boolean archived) {
        UserView user = RequestUser.require(request);
        return ApiResponse.ok(conversations.list(user.getId(), q, archived));
    }

    @GetMapping("/conversations/{id}")
    public ApiResponse<Map<String, Object>> get(HttpServletRequest request, @PathVariable long id) {
        UserView user = RequestUser.require(request);
        return ApiResponse.ok(conversations.get(user.getId(), id));
    }

    @DeleteMapping("/conversations/{id}")
    public ApiResponse<Void> delete(HttpServletRequest request, @PathVariable long id) {
        UserView user = RequestUser.require(request);
        conversations.delete(user.getId(), id);
        return ApiResponse.ok(null);
    }

    @PutMapping("/conversations/{id}")
    public ApiResponse<Map<String, Object>> rename(HttpServletRequest request, @PathVariable long id,
                                                   @RequestBody Map<String, Object> body) {
        UserView user = RequestUser.require(request);
        String title = body == null || body.get("title") == null ? "" : String.valueOf(body.get("title"));
        return ApiResponse.ok(conversations.rename(user.getId(), id, title));
    }

    @PutMapping("/conversations/{id}/archive")
    public ApiResponse<Map<String, Object>> archive(HttpServletRequest request, @PathVariable long id,
                                                    @RequestBody Map<String, Object> body) {
        UserView user = RequestUser.require(request);
        boolean archived = body != null && (Boolean.TRUE.equals(body.get("archived"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("archived")))
                || "1".equals(String.valueOf(body.get("archived"))));
        return ApiResponse.ok(conversations.setArchived(user.getId(), id, archived));
    }

    @PostMapping("/chat")
    public ApiResponse<Map<String, Object>> chat(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        UserView user = RequestUser.require(request);
        return ApiResponse.ok(aiChatService.chat(user, body));
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        UserView user = RequestUser.require(request);
        SseEmitter emitter = new SseEmitter(180_000L);
        AtomicBoolean cancelled = new AtomicBoolean(false);
        emitter.onTimeout(() -> cancelled.set(true));
        emitter.onError(error -> cancelled.set(true));
        emitter.onCompletion(() -> cancelled.set(true));
        aiChatExecutor.execute(() -> {
            try {
                Map<String, Object> result = aiChatService.chat(user, body,
                        label -> send(emitter, "status", Map.of("label", label), cancelled), cancelled::get);
                send(emitter, "done", result, cancelled);
                emitter.complete();
            } catch (BusinessException e) {
                send(emitter, "error", Map.of("message", e.getMessage()), cancelled);
                emitter.complete();
            } catch (Exception e) {
                send(emitter, "error", Map.of("message", "AI 服务请求失败"), cancelled);
                emitter.complete();
            }
        });
        return emitter;
    }

    private void send(SseEmitter emitter, String event, Object data, AtomicBoolean cancelled) {
        try {
            emitter.send(SseEmitter.event().name(event).data(objectMapper.writeValueAsString(data)));
        } catch (Exception ignored) {
            cancelled.set(true);
        }
    }
}
