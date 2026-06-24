package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.service.FinanceService;
import com.eurasia.nursery.web.RequestUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/finance")
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary(@RequestParam(required = false) String city) {
        String c = blankToNull(city);
        return ApiResponse.ok(financeService.summary(c));
    }

    @GetMapping("/sales-trend")
    public ApiResponse<Map<String, Object>> salesTrend(@RequestParam(required = false) String city) {
        return ApiResponse.ok(financeService.salesTrend(blankToNull(city)));
    }

    @GetMapping("/asset-stats")
    public ApiResponse<Map<String, Object>> assetStats(@RequestParam(required = false) String city) {
        return ApiResponse.ok(financeService.assetStats(blankToNull(city)));
    }

    @GetMapping("/sales-by-city")
    public ApiResponse<Map<String, Object>> salesByCity() {
        return ApiResponse.ok(financeService.salesByCity());
    }

    @GetMapping("/sales-by-district")
    public ApiResponse<Map<String, Object>> salesByDistrict(@RequestParam(required = false) String city) {
        return ApiResponse.ok(financeService.salesByDistrict(blankToNull(city)));
    }

    @PutMapping("/settings")
    public ApiResponse<Map<String, Object>> updateSettings(
            HttpServletRequest request,
            @RequestParam(required = false) String city,
            @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(financeService.updateSettings(RequestUser.require(request), body, blankToNull(city)));
    }

    @PutMapping("/sales-trend")
    public ApiResponse<Map<String, Object>> updateSalesTrend(
            HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(financeService.updateSalesTrend(RequestUser.require(request), body));
    }

    @PutMapping("/asset-stats")
    public ApiResponse<Map<String, Object>> updateAssetStats(
            HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(financeService.updateAssetStats(RequestUser.require(request), body));
    }

    @PutMapping("/monthly")
    public ApiResponse<Map<String, Object>> updateMonth(
            HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(financeService.updateMonth(RequestUser.require(request), body));
    }

    @PutMapping("/asset-value")
    public ApiResponse<Map<String, Object>> updateAssetValue(
            HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(financeService.updateAssetValue(RequestUser.require(request), body));
    }

    private static String blankToNull(String city) {
        return city != null && !city.isBlank() ? city.trim() : null;
    }
}
