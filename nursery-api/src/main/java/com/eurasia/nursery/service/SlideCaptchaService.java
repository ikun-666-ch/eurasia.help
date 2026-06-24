package com.eurasia.nursery.service;

import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.support.FileJsonStore;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

/** 对齐 PHP SlideCaptcha */
@Service
public class SlideCaptchaService {

    private static final int INIT_TTL_SEC = 300;
    private static final int VERIFIED_TTL_SEC = 120;
    private static final int MIN_ELAPSED_MS = 280;
    private static final int MAX_ELAPSED_MS = 120000;
    private static final double MIN_PASS_RATIO = 0.92;
    private static final int MIN_TRACK_WIDTH = 100;

    private final NurseryProperties properties;
    private final FileJsonStore fileJsonStore;
    private final SecureRandom random = new SecureRandom();

    public SlideCaptchaService(NurseryProperties properties, FileJsonStore fileJsonStore) {
        this.properties = properties;
        this.fileJsonStore = fileJsonStore;
    }

    public Map<String, Object> init() {
        purgeExpired();
        String token = HexFormat.of().formatHex(random.generateSeed(16));
        Map<String, Map<String, Object>> store = load();
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("created_at", Instant.now().getEpochSecond());
        entry.put("status", "pending");
        store.put(token, entry);
        save(store);
        return Map.of("token", token, "expiresIn", INIT_TTL_SEC);
    }

    public Map<String, Object> verify(String token, int elapsedMs, int trackWidth, int slideDistance) {
        purgeExpired();
        token = token == null ? "" : token.trim();
        if (token.isEmpty()) {
            return null;
        }
        Map<String, Map<String, Object>> store = load();
        Map<String, Object> entry = store.get(token);
        if (entry == null || !"pending".equals(entry.get("status"))) {
            return null;
        }
        long createdAt = ((Number) entry.getOrDefault("created_at", 0)).longValue();
        if (createdAt <= 0 || Instant.now().getEpochSecond() - createdAt > INIT_TTL_SEC) {
            store.remove(token);
            save(store);
            return null;
        }
        if (elapsedMs < MIN_ELAPSED_MS || elapsedMs > MAX_ELAPSED_MS) {
            return null;
        }
        if (trackWidth < MIN_TRACK_WIDTH || slideDistance <= 0) {
            return null;
        }
        if ((double) slideDistance / trackWidth < MIN_PASS_RATIO) {
            return null;
        }
        Map<String, Object> verified = new LinkedHashMap<>();
        verified.put("created_at", createdAt);
        verified.put("verified_at", Instant.now().getEpochSecond());
        verified.put("status", "verified");
        store.put(token, verified);
        save(store);
        return Map.of("captchaToken", token, "expiresIn", VERIFIED_TTL_SEC);
    }

    public boolean consume(String token) {
        purgeExpired();
        token = token == null ? "" : token.trim();
        if (token.isEmpty()) {
            return false;
        }
        Map<String, Map<String, Object>> store = load();
        Map<String, Object> entry = store.get(token);
        if (entry == null || !"verified".equals(entry.get("status"))) {
            return false;
        }
        long verifiedAt = ((Number) entry.getOrDefault("verified_at", 0)).longValue();
        if (verifiedAt <= 0 || Instant.now().getEpochSecond() - verifiedAt > VERIFIED_TTL_SEC) {
            store.remove(token);
            save(store);
            return false;
        }
        store.remove(token);
        save(store);
        return true;
    }

    private Map<String, Map<String, Object>> load() {
        return fileJsonStore.read(storePath(), new TypeReference<>() {}, new LinkedHashMap<>());
    }

    private void save(Map<String, Map<String, Object>> store) {
        fileJsonStore.write(storePath(), store);
    }

    private Path storePath() {
        return Path.of(properties.getDataDir(), "slide_captcha.json");
    }

    private void purgeExpired() {
        long now = Instant.now().getEpochSecond();
        Map<String, Map<String, Object>> store = load();
        boolean changed = false;
        for (var it = store.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<String, Map<String, Object>> e = it.next();
            Map<String, Object> entry = e.getValue();
            String status = String.valueOf(entry.get("status"));
            if ("pending".equals(status)) {
                long createdAt = ((Number) entry.getOrDefault("created_at", 0)).longValue();
                if (createdAt <= 0 || now - createdAt > INIT_TTL_SEC) {
                    it.remove();
                    changed = true;
                }
            } else if ("verified".equals(status)) {
                long verifiedAt = ((Number) entry.getOrDefault("verified_at", 0)).longValue();
                if (verifiedAt <= 0 || now - verifiedAt > VERIFIED_TTL_SEC) {
                    it.remove();
                    changed = true;
                }
            }
        }
        if (changed) {
            save(store);
        }
    }
}
