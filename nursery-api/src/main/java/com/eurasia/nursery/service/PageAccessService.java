package com.eurasia.nursery.service;

import com.eurasia.nursery.domain.model.UserView;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 对齐 PHP PageAccess */
@Component
public class PageAccessService {

    public static final List<String> ALL_PAGES = List.of("home", "admin", "sal", "inv", "fin", "orders", "profile");

    private static final Map<String, List<String>> ROLE_DEFAULTS = Map.of(
            "ADMIN", List.of("home", "admin", "sal", "inv", "fin", "orders", "profile"),
            "INVENTORY", List.of("home", "inv", "profile"),
            "SALES", List.of("home", "sal", "orders", "profile"),
            "FINANCE", List.of("home", "fin", "profile")
    );

    private final ObjectMapper objectMapper;

    public PageAccessService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<String> roleDefaults(String roleCode) {
        return ROLE_DEFAULTS.getOrDefault(roleCode, List.of("home", "profile"));
    }

    public List<String> parseExtra(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> arr = objectMapper.readValue(json, new TypeReference<>() {});
            List<String> out = new ArrayList<>();
            for (String p : arr) {
                if (ALL_PAGES.contains(p)) {
                    out.add(p);
                }
            }
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    public List<String> resolve(String roleCode, String extraJson) {
        if ("ADMIN".equals(roleCode)) {
            return ALL_PAGES;
        }
        List<String> defaults = new ArrayList<>(roleDefaults(roleCode));
        List<String> extra = new ArrayList<>(parseExtra(extraJson));
        extra.removeIf(p -> List.of("admin").contains(p));
        for (String p : extra) {
            if (!defaults.contains(p)) {
                defaults.add(p);
            }
        }
        return defaults;
    }

    public List<String> sanitizeExtraForRole(String roleCode, List<String> requested) {
        if ("ADMIN".equals(roleCode)) {
            return List.of();
        }
        List<String> defaults = roleDefaults(roleCode);
        List<String> valid = new ArrayList<>();
        for (String p : requested) {
            if (ALL_PAGES.contains(p) && !defaults.contains(p) && !List.of("admin").contains(p)) {
                valid.add(p);
            }
        }
        return valid;
    }

    public List<String> workflowScopes(String roleCode, String extraJson) {
        List<String> pages = resolve(roleCode, extraJson);
        List<String> scopes = new ArrayList<>();
        if (pages.contains("sal") || pages.contains("orders")) {
            scopes.add("sales");
        }
        if (pages.contains("inv")) {
            scopes.add("inventory");
        }
        if (pages.contains("fin")) {
            scopes.add("finance");
        }
        return scopes;
    }

    public List<String> workflowScopesForUser(UserView user) {
        return workflowScopes(user.getRoleCode(), user.getExtraPageAccess());
    }

    public boolean canAccess(String roleCode, String extraJson, String page) {
        return resolve(roleCode, extraJson).contains(page);
    }

    /** 大屏 panel_key（如 sal.chart2）→ pageAccess 页面 key */
    public String panelPageKey(String panelKey) {
        if (panelKey.startsWith("inv.")) {
            return "inv";
        }
        if (panelKey.startsWith("sal.")) {
            return "sal";
        }
        if (panelKey.startsWith("fin.")) {
            return "fin";
        }
        if (panelKey.startsWith("admin.")) {
            return "admin";
        }
        return null;
    }

    public boolean canEditPanel(UserView user, String panelKey) {
        String page = panelPageKey(panelKey);
        if (page == null) {
            return "ADMIN".equals(user.getRoleCode());
        }
        return canAccess(user.getRoleCode(), user.getExtraPageAccess(), page);
    }
}
