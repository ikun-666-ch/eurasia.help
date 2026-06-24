package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.service.PanelService;
import com.eurasia.nursery.web.RequestUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/panels")
public class PanelController {

    private final PanelService panelService;

    public PanelController(PanelService panelService) {
        this.panelService = panelService;
    }

    @GetMapping("/{key}")
    public ApiResponse<Map<String, Object>> get(@PathVariable String key) {
        return ApiResponse.ok(panelService.get(key));
    }

    @PutMapping("/{key}")
    public ApiResponse<Map<String, Object>> save(
            HttpServletRequest request, @PathVariable String key, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(panelService.save(RequestUser.require(request), key, body));
    }
}
