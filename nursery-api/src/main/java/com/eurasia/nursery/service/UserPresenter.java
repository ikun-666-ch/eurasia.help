package com.eurasia.nursery.service;

import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class UserPresenter {

    private final PageAccessService pageAccessService;
    private final ObjectMapper objectMapper;

    public UserPresenter(PageAccessService pageAccessService, ObjectMapper objectMapper) {
        this.pageAccessService = pageAccessService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> mapUserRow(UserView u) {
        String roleCode = u.getRoleCode() == null ? "" : u.getRoleCode();
        String extraJson = u.getExtraPageAccess() == null ? "[]" : u.getExtraPageAccess();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("username", u.getUsername());
        row.put("phone", u.getPhone() == null ? "" : u.getPhone());
        row.put("displayName", u.getDisplayName());
        row.put("roleId", u.getRoleId());
        row.put("roleCode", roleCode);
        row.put("roleName", u.getRoleName() == null ? "" : u.getRoleName());
        row.put("status", statusLabel(u.getStatus()));
        row.put("lastLoginAt", formatDateTime(u.getLastLoginAt()));
        row.put("defaultPages", pageAccessService.roleDefaults(roleCode));
        row.put("extraPages", pageAccessService.parseExtra(extraJson));
        row.put("pageAccess", pageAccessService.resolve(roleCode, extraJson));
        return row;
    }

    public String statusLabel(String status) {
        if (status == null) {
            return "离线";
        }
        return switch (status) {
            case "ONLINE" -> "在线";
            case "DISABLED" -> "禁用";
            default -> "离线";
        };
    }

    public String parseStatus(String label) {
        if (label == null) {
            return "OFFLINE";
        }
        String t = label.trim();
        return switch (t) {
            case "在线", "ONLINE" -> "ONLINE";
            case "禁用", "DISABLED" -> "DISABLED";
            default -> "OFFLINE";
        };
    }

    public String encodeExtra(List<String> extra) {
        try {
            return objectMapper.writeValueAsString(extra);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private String formatDateTime(LocalDateTime dt) {
        return dt == null ? null : dt.toString().replace('T', ' ');
    }
}
