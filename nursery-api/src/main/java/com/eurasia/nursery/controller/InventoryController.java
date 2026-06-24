package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.InventoryService;
import com.eurasia.nursery.web.RoleAuth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/sku-catalog")
    public ApiResponse<Map<String, Object>> skuCatalog() {
        return ApiResponse.ok(inventoryService.skuCatalog());
    }

    @GetMapping("/ledger")
    public ApiResponse<List<Map<String, Object>>> listLedger() {
        return ApiResponse.ok(inventoryService.listLedger());
    }

    @GetMapping("/daily-trend")
    public ApiResponse<Map<String, Object>> dailyTrend(@RequestParam(required = false) String city) {
        String c = city != null && !city.isBlank() ? city.trim() : null;
        return ApiResponse.ok(inventoryService.dailyTrend(c));
    }

    @GetMapping("/io-trend")
    public ApiResponse<Map<String, Object>> ioTrend(@RequestParam(required = false) String city) {
        return ApiResponse.ok(inventoryService.ioTrend(city));
    }

    @PostMapping("/ledger")
    public ApiResponse<Map<String, Object>> createLedger(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        UserView user = RoleAuth.requireRoles(request, "ADMIN", "INVENTORY");
        return ApiResponse.ok(inventoryService.createLedger(user, body));
    }

    @PutMapping("/ledger/{id}")
    public ApiResponse<Map<String, Object>> updateLedger(HttpServletRequest request, @PathVariable long id,
                                                        @RequestBody Map<String, Object> body) {
        RoleAuth.requireRoles(request, "ADMIN", "INVENTORY");
        return ApiResponse.ok(inventoryService.updateLedger(id, body));
    }

    @DeleteMapping("/ledger/{id}")
    public ApiResponse<Void> deleteLedger(HttpServletRequest request, @PathVariable long id) {
        RoleAuth.requireRoles(request, "ADMIN", "INVENTORY");
        inventoryService.deleteLedger(id);
        return ApiResponse.ok(null);
    }
}
