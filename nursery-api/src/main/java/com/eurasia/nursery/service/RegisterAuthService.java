package com.eurasia.nursery.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class RegisterAuthService {

    private static final List<String> ALLOWED_ROLE_CODES = List.of("ADMIN", "INVENTORY", "SALES", "FINANCE");

    private final com.eurasia.nursery.config.NurseryProperties properties;

    public RegisterAuthService(com.eurasia.nursery.config.NurseryProperties properties) {
        this.properties = properties;
    }

    public List<String> allowedRoleCodes() {
        return ALLOWED_ROLE_CODES;
    }

    public boolean verifyAdminRegisterKey(String key) {
        String suffix = properties.getAdminRegisterKeySuffix();
        if (suffix == null || suffix.isBlank()) {
            return false;
        }
        String digits = key == null ? "" : key.replaceAll("\\D", "");
        if (digits.length() != 10) {
            return false;
        }
        String today = LocalDate.now(ZoneId.of("Asia/Shanghai")).format(java.time.format.DateTimeFormatter.ofPattern("MMdd"));
        return (today + suffix).equals(digits);
    }
}
