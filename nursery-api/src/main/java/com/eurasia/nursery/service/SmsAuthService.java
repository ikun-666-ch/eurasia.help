package com.eurasia.nursery.service;

import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.support.FileJsonStore;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/** 对齐 PHP SmsAuth */
@Service
public class SmsAuthService {

    private static final int SMS_TTL_SEC = 300;
    private static final int SEND_COOLDOWN_SEC = 60;

    private final NurseryProperties properties;
    private final FileJsonStore fileJsonStore;
    private final IhuyiSmsClient ihuyiSmsClient;

    public SmsAuthService(NurseryProperties properties, FileJsonStore fileJsonStore, IhuyiSmsClient ihuyiSmsClient) {
        this.properties = properties;
        this.fileJsonStore = fileJsonStore;
        this.ihuyiSmsClient = ihuyiSmsClient;
    }

    public String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() == 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
        }
        return digits.length() == 11 ? digits : "";
    }

    public Map<String, String> loginMasks() {
        Map<String, String> out = new LinkedHashMap<>();
        List<String> phones = properties.getAuthPhones();
        String[] keys = {"self", "partner"};
        for (int i = 0; i < keys.length && i < phones.size(); i++) {
            String digits = phones.get(i).replaceAll("\\D", "");
            if (digits.length() >= 2) {
                out.put(keys[i], digits.substring(0, 2) + "*****");
            }
        }
        return out;
    }

    public boolean isAllowedPhone(String phone) {
        String normalized = normalizePhone(phone);
        if (normalized.isEmpty()) {
            return false;
        }
        return properties.getAuthPhones().stream()
                .map(this::normalizePhone)
                .anyMatch(normalized::equals);
    }

    public String usernameForPhone(String phone) {
        String normalized = normalizePhone(phone);
        List<String> phones = properties.getAuthPhones();
        List<String> usernames = properties.getAuthPhoneUsernames();
        for (int i = 0; i < phones.size(); i++) {
            if (normalized.equals(normalizePhone(phones.get(i)))) {
                if (i < usernames.size()) {
                    String username = usernames.get(i).trim();
                    return username.isEmpty() ? null : username;
                }
            }
        }
        return null;
    }

    public void setSmsCode(String phone, String code, String purpose) {
        Map<String, Map<String, Object>> store = loadCodes();
        String key = purpose + ":" + normalizePhone(phone);
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("code", code);
        entry.put("expiry", Instant.now().getEpochSecond() + SMS_TTL_SEC);
        entry.put("sent_at", Instant.now().getEpochSecond());
        store.put(key, entry);
        saveCodes(store);
    }

    public boolean verifySmsCode(String phone, String code, String purpose) {
        String normalized = normalizePhone(phone);
        if (normalized.isEmpty() || code == null || code.isBlank()) {
            return false;
        }
        Map<String, Map<String, Object>> store = loadCodes();
        String key = purpose + ":" + normalized;
        Map<String, Object> entry = store.get(key);
        if (entry == null) {
            return false;
        }
        long expiry = ((Number) entry.getOrDefault("expiry", 0)).longValue();
        if (expiry < Instant.now().getEpochSecond()) {
            return false;
        }
        if (!String.valueOf(entry.get("code")).equals(code.trim())) {
            return false;
        }
        store.remove(key);
        saveCodes(store);
        return true;
    }

    public void checkSendCooldownOrThrow(String phone, String purpose) {
        String normalized = normalizePhone(phone);
        Map<String, Map<String, Object>> store = loadCodes();
        Map<String, Object> entry = store.get(purpose + ":" + normalized);
        if (entry == null) {
            return;
        }
        long sentAt = ((Number) entry.getOrDefault("sent_at", 0)).longValue();
        long elapsed = Instant.now().getEpochSecond() - sentAt;
        if (sentAt > 0 && elapsed < SEND_COOLDOWN_SEC) {
            throw new com.eurasia.nursery.common.BusinessException(
                    "发送过于频繁，请" + (SEND_COOLDOWN_SEC - elapsed) + "秒后再试", 429);
        }
    }

    public String randomCode() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(1000, 10000));
    }

    public IhuyiSmsClient.SendResult sendViaIhuyi(String mobile, String code) {
        return ihuyiSmsClient.send(normalizePhone(mobile), code);
    }

    private Map<String, Map<String, Object>> loadCodes() {
        return fileJsonStore.read(codesPath(), new TypeReference<>() {}, new LinkedHashMap<>());
    }

    private void saveCodes(Map<String, Map<String, Object>> store) {
        fileJsonStore.write(codesPath(), store);
    }

    private Path codesPath() {
        return Path.of(properties.getDataDir(), "sms_codes.json");
    }
}
