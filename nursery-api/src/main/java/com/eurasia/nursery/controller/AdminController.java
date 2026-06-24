package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.AdminService;
import com.eurasia.nursery.web.AdminAuth;
import com.eurasia.nursery.web.RequestUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;
    private final AdminAuth adminAuth;

    public AdminController(AdminService adminService, AdminAuth adminAuth) {
        this.adminService = adminService;
        this.adminAuth = adminAuth;
    }

    @GetMapping("/dashboard/kpi")
    public ApiResponse<Map<String, Object>> dashboardKpi(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.dashboardKpi());
    }

    @GetMapping("/system/settings")
    public ApiResponse<Map<String, Object>> getSystemSettings(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.getSystemSettings());
    }

    @PutMapping("/system/settings")
    public ApiResponse<Map<String, Object>> updateSystemSettings(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.updateSystemSettings(body));
    }

    @GetMapping("/system/metrics")
    public ApiResponse<Map<String, Object>> getSystemMetrics(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.getSystemMetrics());
    }

    @PostMapping("/system/daily-fill")
    public ApiResponse<Map<String, Object>> runDailyAutoFill(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.runDailyAutoFill());
    }

    @GetMapping("/users")
    public ApiResponse<List<Map<String, Object>>> listUsers(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.listUsers());
    }

    @PostMapping("/users")
    public ApiResponse<Map<String, Object>> createUser(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.createUser(body));
    }

    @PutMapping("/users/{id}")
    public ApiResponse<Map<String, Object>> updateUser(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.updateUser(id, body));
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(HttpServletRequest request, @PathVariable long id) {
        adminAuth.requireAdmin(request);
        UserView current = RequestUser.require(request);
        adminService.deleteUser(id, current.getUsername());
        return ApiResponse.ok(null);
    }

    @PostMapping("/users/{id}/reset-password")
    public ApiResponse<Void> resetPassword(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        adminService.resetPassword(id, body);
        return ApiResponse.ok(null);
    }

    @GetMapping("/roles")
    public ApiResponse<List<Map<String, Object>>> listRoles(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.listRoles());
    }

    @PutMapping("/roles/{id}")
    public ApiResponse<Map<String, Object>> updateRole(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.updateRole(id, body));
    }

    @GetMapping("/categories")
    public ApiResponse<List<Map<String, Object>>> listCategories(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.listCategories());
    }

    @PostMapping("/categories")
    public ApiResponse<Map<String, Object>> createCategory(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.createCategory(body));
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<Map<String, Object>> updateCategory(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.updateCategory(id, body));
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(HttpServletRequest request, @PathVariable long id) {
        adminAuth.requireAdmin(request);
        adminService.deleteCategory(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/skus")
    public ApiResponse<List<Map<String, Object>>> listSkus(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.listSkus());
    }

    @PostMapping("/skus")
    public ApiResponse<Map<String, Object>> createSku(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.createSku(body));
    }

    @PutMapping("/skus/{id}")
    public ApiResponse<Map<String, Object>> updateSku(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.updateSku(id, body));
    }

    @DeleteMapping("/skus/{id}")
    public ApiResponse<Void> deleteSku(HttpServletRequest request, @PathVariable long id) {
        adminAuth.requireAdmin(request);
        adminService.deleteSku(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/customers")
    public ApiResponse<List<Map<String, Object>>> listCustomers(HttpServletRequest request) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.listCustomers());
    }

    @PostMapping("/customers")
    public ApiResponse<Map<String, Object>> createCustomer(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.createCustomer(body));
    }

    @PutMapping("/customers/{id}")
    public ApiResponse<Map<String, Object>> updateCustomer(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        adminAuth.requireAdmin(request);
        return ApiResponse.ok(adminService.updateCustomer(id, body));
    }

    @DeleteMapping("/customers/{id}")
    public ApiResponse<Void> deleteCustomer(HttpServletRequest request, @PathVariable long id) {
        adminAuth.requireAdmin(request);
        adminService.deleteCustomer(id);
        return ApiResponse.ok(null);
    }
}
