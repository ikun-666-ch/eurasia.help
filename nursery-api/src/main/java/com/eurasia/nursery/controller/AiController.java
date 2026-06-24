package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.service.AiChatService;
import com.eurasia.nursery.web.RequestUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final AiChatService aiChatService;

    public AiController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @PostMapping("/chat")
    public ApiResponse<Map<String, Object>> chat(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        RequestUser.require(request);
        return ApiResponse.ok(aiChatService.chat(body));
    }
}
