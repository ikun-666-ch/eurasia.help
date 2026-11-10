package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.AdminService;
import com.eurasia.nursery.service.AuthService;
import com.eurasia.nursery.service.PanelService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SystemAiTools {

    private final AdminService adminService;
    private final PanelService panelService;
    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final AiAccess access;
    private final AiWrites writes;
    private final AiUndoService undoService;
    private final com.eurasia.nursery.service.PageAccessService pageAccessService;

    public SystemAiTools(AdminService adminService, PanelService panelService, AuthService authService, ObjectMapper objectMapper,
                         AiAccess access, AiWrites writes, AiUndoService undoService,
                         com.eurasia.nursery.service.PageAccessService pageAccessService) {
        this.adminService = adminService;
        this.panelService = panelService;
        this.authService = authService;
        this.objectMapper = objectMapper;
        this.access = access;
        this.writes = writes;
        this.undoService = undoService;
        this.pageAccessService = pageAccessService;
    }

    public List<AiTool> tools() {
        return List.of(system(), panels(), profile(), undo());
    }

    private AiTool system() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "dashboard 管理概览；get_settings 自动填数开关；update_settings 修改自动填数；metrics 运行指标（不含密钥）；daily_fill 立刻补齐每日数据",
                "dashboard", "get_settings", "update_settings", "metrics", "daily_fill");
        AiSchemas.prop(objectMapper, schema, "autoFillEnabled", "boolean", "是否开启自动填数");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("system", "管理概览、系统设置和运行指标。不要尝试读取数据库密码、JWT 或短信密钥。", schema, Map.of(
                "dashboard", "查询管理概览",
                "get_settings", "查询系统设置",
                "update_settings", "更新系统设置",
                "metrics", "查询系统运行指标",
                "daily_fill", "执行每日自动填数"
        ), this::systemHandle);
    }

    private AiTool panels() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action", "get 读取；save 保存", "get", "save");
        AiSchemas.prop(objectMapper, schema, "key", "string", "面板键，如 inv.chart2、sal.chart1、fin.chart2");
        AiSchemas.prop(objectMapper, schema, "payload", "object", "要保存的配置对象");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("panels", "大屏面板配置。保存时必须同时给 key 和 payload。", schema, Map.of(
                "get", "查询大屏配置",
                "save", "保存大屏配置"
        ), this::panelsHandle);
    }

    private AiTool profile() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action", "get 当前用户资料；update 修改姓名或用户名", "get", "update");
        AiSchemas.prop(objectMapper, schema, "displayName", "string", "姓名");
        AiSchemas.prop(objectMapper, schema, "username", "string", "用户名。修改后当前登录会失效");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("profile", "当前登录用户的资料。不能用这个工具改别人的账号，也不能改密码。", schema, Map.of(
                "get", "查询我的资料",
                "update", "更新我的资料"
        ), this::profileHandle);
    }

    private Object systemHandle(UserView caller, JsonNode args) {
        access.requireAdmin(caller);
        return switch (AiArgs.action(args)) {
            case "dashboard" -> adminService.dashboardKpi();
            case "get_settings" -> adminService.getSystemSettings();
            case "update_settings" -> {
                Map<String, Object> before = adminService.getSystemSettings();
                boolean next = AiArgs.present(args, "autoFillEnabled") && Boolean.TRUE.equals(objectMapper.convertValue(args.get("autoFillEnabled"), Boolean.class));
                String summary = (next ? "开启" : "关闭") + "自动填数";
                yield writes.run(caller, "system", "update_settings", summary, before, false, true,
                        () -> adminService.updateSystemSettings(AiArgs.pick(objectMapper, args, "autoFillEnabled")));
            }
            case "metrics" -> adminService.getSystemMetrics();
            case "daily_fill" -> writes.run(caller, "system", "daily_fill", "执行每日自动填数", null, true, false,
                    adminService::runDailyAutoFill);
            default -> AiResults.unknownAction("dashboard", "get_settings", "update_settings", "metrics", "daily_fill");
        };
    }

    private AiTool undo() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.prop(objectMapper, schema, "auditId", "integer", "要撤销的审计 id。不填则撤销你最近一条可撤销的 AI 写入");
        return new AiTool("undo",
                "撤销当前用户通过小林做过、且标记为可撤销的写入。不能撤销删除用户、重置密码、出库、结算这类动作。回复里要说明撤销了什么。",
                schema, Map.of("", "撤销上一次写入"), (caller, args) -> {
                    Long auditId = AiArgs.present(args, "auditId") ? AiArgs.requiredLong(args, "auditId") : null;
                    return undoService.undo(caller, auditId);
                });
    }

    private Object panelsHandle(UserView caller, JsonNode args) {
        String key = AiArgs.text(args, "key");
        if (key.isEmpty()) {
            throw new BusinessException("缺少 key");
        }
        if ("get".equals(AiArgs.action(args))) {
            String page = pageAccessService.panelPageKey(key);
            if (page == null) {
                access.requireAdmin(caller);
            } else {
                access.requireAnyPage(caller, page);
            }
            return panelService.get(key);
        }
        if ("save".equals(AiArgs.action(args))) {
            Map<String, Object> body = new LinkedHashMap<>();
            if (AiArgs.present(args, "payload")) {
                body.put("payload", objectMapper.convertValue(args.get("payload"), Object.class));
            }
            Map<String, Object> before = panelService.get(key);
            return writes.run(caller, "panels", "save", "保存大屏配置 " + key, before, false, false,
                    () -> panelService.save(caller, key, body));
        }
        return AiResults.unknownAction("get", "save");
    }

    private Object profileHandle(UserView caller, JsonNode args) {
        if (caller == null) {
            throw new BusinessException("未登录");
        }
        return switch (AiArgs.action(args)) {
            case "get" -> authService.authMe(caller);
            case "update" -> {
                Map<String, Object> updated = new LinkedHashMap<>(authService.updateProfile(caller,
                        AiArgs.pick(objectMapper, args, "displayName", "username")));
                updated.remove("token");
                if (AiArgs.present(args, "username")) {
                    updated.put("sessionMayReset", true);
                }
                yield updated;
            }
            default -> AiResults.unknownAction("get", "update");
        };
    }
}
