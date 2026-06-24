package com.eurasia.nursery.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/** 与 PHP Nursery\Jwt 完全一致的 HS256 + base64url 实现 */
@Component
public class PhpCompatibleJwt {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final byte[] secret;

    public PhpCompatibleJwt(com.eurasia.nursery.config.NurseryProperties properties) {
        this.secret = properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
    }

    public String encode(String username, String roleCode, long ttlSeconds) {
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", username);
        payload.put("role", roleCode);
        payload.put("exp", System.currentTimeMillis() / 1000 + ttlSeconds);

        String headerPart = b64(header);
        String bodyPart = b64(payload);
        String sigPart = b64(hmacSha256(headerPart + "." + bodyPart));
        return headerPart + "." + bodyPart + "." + sigPart;
    }

    public Map<String, Object> decode(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return null;
        }
        String expected = b64(hmacSha256(parts[0] + "." + parts[1]));
        if (!expected.equals(parts[2])) {
            return null;
        }
        try {
            Map<String, Object> payload = MAPPER.readValue(ub64(parts[1]), new TypeReference<>() {});
            long exp = ((Number) payload.getOrDefault("exp", 0)).longValue();
            if (exp < System.currentTimeMillis() / 1000) {
                return null;
            }
            return payload;
        } catch (Exception e) {
            return null;
        }
    }

    private byte[] hmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String b64(Object data) {
        byte[] bytes;
        if (data instanceof byte[] raw) {
            bytes = raw;
        } else {
            try {
                bytes = MAPPER.writeValueAsBytes(data);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String ub64(String data) {
        int pad = 4 - data.length() % 4;
        if (pad < 4) {
            data = data + "=".repeat(pad);
        }
        byte[] decoded = Base64.getUrlDecoder().decode(data);
        return new String(decoded, StandardCharsets.UTF_8);
    }
}
