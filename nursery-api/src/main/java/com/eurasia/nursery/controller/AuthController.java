package com.eurasia.nursery.controller;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.AuthService;
import com.eurasia.nursery.web.RequestUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.login(
                String.valueOf(body.getOrDefault("username", "")),
                String.valueOf(body.getOrDefault("password", ""))
        ));
    }

    @GetMapping("/login-masks")
    public ApiResponse<Map<String, String>> loginMasks() {
        return ApiResponse.ok(authService.loginMasks());
    }

    @PostMapping("/sms/send")
    public ApiResponse<Map<String, Object>> sendSms(@RequestBody Map<String, Object> body) {
        authService.sendSmsCode(String.valueOf(body.getOrDefault("mobile", "")));
        return ApiResponse.ok(Map.of("sent", true), "验证码已发送");
    }

    @PostMapping("/sms/login")
    public ApiResponse<Map<String, Object>> loginSms(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.loginSms(
                String.valueOf(body.getOrDefault("mobile", "")),
                String.valueOf(body.getOrDefault("code", ""))
        ));
    }

    @PostMapping("/captcha/slide/init")
    public ApiResponse<Map<String, Object>> initSlideCaptcha() {
        return ApiResponse.ok(authService.initSlideCaptcha());
    }

    @PostMapping("/captcha/slide/verify")
    public ApiResponse<Map<String, Object>> verifySlideCaptcha(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.verifySlideCaptcha(
                String.valueOf(body.getOrDefault("token", "")),
                intVal(body.get("elapsedMs")),
                intVal(body.get("trackWidth")),
                intVal(body.get("slideDistance"))
        ));
    }

    @PostMapping("/register/send-code")
    public ApiResponse<Map<String, Object>> sendRegisterCode(@RequestBody Map<String, Object> body) {
        authService.sendRegisterCode(body);
        return ApiResponse.ok(Map.of("sent", true), "验证码已发送");
    }

    @GetMapping("/register/roles")
    public ApiResponse<List<?>> listRegisterRoles() {
        return ApiResponse.ok(authService.listRegisterRoles());
    }

    @PostMapping("/forgot-password/send-code")
    public ApiResponse<Map<String, Object>> sendForgotPasswordCode(@RequestBody Map<String, Object> body) {
        authService.sendForgotPasswordCode(body);
        return ApiResponse.ok(Map.of("sent", true), "验证码已发送");
    }

    @PostMapping("/forgot-password/reset")
    public ApiResponse<Void> resetForgotPassword(@RequestBody Map<String, Object> body) {
        authService.resetForgotPassword(
                String.valueOf(body.getOrDefault("mobile", "")),
                String.valueOf(body.getOrDefault("code", "")),
                String.valueOf(body.getOrDefault("password", ""))
        );
        return ApiResponse.okMessage("密码已重置，请使用新密码登录");
    }

    @PostMapping("/register")
    public ApiResponse<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.register(body));
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(HttpServletRequest request) {
        return ApiResponse.ok(authService.authMe(RequestUser.require(request)));
    }

    @PutMapping("/me")
    public ApiResponse<Map<String, Object>> updateMe(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.updateProfile(RequestUser.require(request), body), "资料已更新");
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        authService.changePassword(
                RequestUser.require(request),
                String.valueOf(body.getOrDefault("oldPassword", "")),
                String.valueOf(body.getOrDefault("newPassword", ""))
        );
        return ApiResponse.okMessage("密码已修改");
    }

    @PostMapping("/phone/send-code")
    public ApiResponse<Map<String, Object>> sendChangePhoneCode(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        authService.sendChangePhoneCode(RequestUser.require(request), body);
        return ApiResponse.ok(Map.of("sent", true), "验证码已发送");
    }

    @PutMapping("/phone")
    public ApiResponse<Map<String, Object>> changePhone(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.changePhone(
                RequestUser.require(request),
                String.valueOf(body.getOrDefault("mobile", "")),
                String.valueOf(body.getOrDefault("code", "")),
                String.valueOf(body.getOrDefault("password", ""))
        ), "手机号已更新");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        authService.logout(RequestUser.require(request));
        return ApiResponse.ok(null);
    }

    private int intVal(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }
}
