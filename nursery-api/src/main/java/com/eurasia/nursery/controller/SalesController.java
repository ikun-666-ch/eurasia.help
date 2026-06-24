package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.service.SalesService;
import com.eurasia.nursery.web.RequestUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sales")
public class SalesController {

    private final SalesService salesService;

    public SalesController(SalesService salesService) {
        this.salesService = salesService;
    }

    @PostMapping("/orders")
    public ApiResponse<Map<String, Object>> createOrder(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(salesService.createOrder(RequestUser.require(request), body));
    }

    @GetMapping("/customers")
    public ApiResponse<List<Map<String, Object>>> listCustomers(
            HttpServletRequest request,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String district) {
        return ApiResponse.ok(salesService.listSalesCustomers(RequestUser.require(request), city, district));
    }

    @GetMapping("/orders")
    public ApiResponse<List<Map<String, Object>>> listOrders(@RequestParam(required = false) String city) {
        String c = city != null && !city.isBlank() ? city.trim() : null;
        return ApiResponse.ok(salesService.listOrders(c));
    }

    @GetMapping("/workflow/pending")
    public ApiResponse<List<Map<String, Object>>> listWorkflowPending(
            HttpServletRequest request,
            @RequestParam(required = false) String scope) {
        return ApiResponse.ok(salesService.listWorkflowPending(RequestUser.require(request), scope));
    }

    @GetMapping("/workflow/pending-count")
    public ApiResponse<Map<String, Object>> workflowPendingCount(
            HttpServletRequest request,
            @RequestParam(required = false) String scope) {
        return ApiResponse.ok(salesService.workflowPendingCount(RequestUser.require(request), scope));
    }

    @PostMapping("/orders/{id}/submit")
    public ApiResponse<Map<String, Object>> submitOrder(
            HttpServletRequest request, @PathVariable long id, @RequestBody(required = false) Map<String, Object> body) {
        return ApiResponse.ok(salesService.submitOrder(RequestUser.require(request), id, body == null ? Map.of() : body));
    }

    @PostMapping("/orders/{id}/ship")
    public ApiResponse<Map<String, Object>> shipOrder(
            HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(salesService.shipOrder(RequestUser.require(request), id, body));
    }

    @PostMapping("/orders/{id}/settle")
    public ApiResponse<Map<String, Object>> settleOrder(
            HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(salesService.settleOrder(RequestUser.require(request), id, body));
    }

    @PostMapping("/orders/{id}/cancel")
    public ApiResponse<Map<String, Object>> cancelOrder(HttpServletRequest request, @PathVariable long id) {
        return ApiResponse.ok(salesService.cancelOrder(RequestUser.require(request), id));
    }

    @PostMapping("/orders/{id}/reject")
    public ApiResponse<Map<String, Object>> rejectOrder(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        String reason = body != null && body.get("reason") != null ? String.valueOf(body.get("reason")) : null;
        return ApiResponse.ok(salesService.rejectOrder(RequestUser.require(request), id, reason));
    }

    @GetMapping("/orders-by-city")
    public ApiResponse<Map<String, Object>> ordersByCity() {
        return ApiResponse.ok(salesService.ordersByCity());
    }

    @GetMapping("/orders-by-district")
    public ApiResponse<Map<String, Object>> ordersByDistrict(@RequestParam(required = false) String city) {
        String c = city != null && !city.isBlank() ? city.trim() : null;
        return ApiResponse.ok(salesService.ordersByDistrict(c));
    }

    @GetMapping("/order-trend")
    public ApiResponse<Map<String, Object>> orderTrend(@RequestParam(required = false) String city) {
        String c = city != null && !city.isBlank() ? city.trim() : null;
        return ApiResponse.ok(salesService.orderTrend(c));
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary(@RequestParam(required = false) String city) {
        String c = city != null && !city.isBlank() ? city.trim() : null;
        return ApiResponse.ok(salesService.summary(c));
    }

    @GetMapping("/orders-by-month")
    public ApiResponse<Map<String, Object>> ordersByMonth(@RequestParam(required = false) String city) {
        String c = city != null && !city.isBlank() ? city.trim() : null;
        return ApiResponse.ok(salesService.ordersByMonth(c));
    }

    @PutMapping("/orders/{id}")
    public ApiResponse<Map<String, Object>> updateOrder(
            HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(salesService.updateOrder(RequestUser.require(request), id, body));
    }

    @PostMapping("/tracking/query")
    public ApiResponse<Map<String, Object>> queryTracking(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(salesService.queryTracking(body));
    }
}
