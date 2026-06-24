package com.eurasia.nursery.service;

import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.support.FileJsonStore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;

/** 对齐 PHP Kuaidi100 */
@Service
public class Kuaidi100Client {

    private final NurseryProperties properties;
    private final FileJsonStore fileJsonStore;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();

    public Kuaidi100Client(NurseryProperties properties, FileJsonStore fileJsonStore, ObjectMapper objectMapper) {
        this.properties = properties;
        this.fileJsonStore = fileJsonStore;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        Map<String, String> cfg = loadConfig();
        return !cfg.get("customer").isBlank() && !cfg.get("key").isBlank();
    }

    public Map<String, Object> queryPipeline(String num, String com, String phone) {
        num = num == null ? "" : num.trim();
        com = com == null ? "" : com.trim();
        phone = phone == null ? "" : phone.replaceAll("\\s+", "");

        List<String> candidates = buildComCandidates(num, com);
        if (candidates.isEmpty()) {
            return Map.of("success", false, "code", 404, "msg", "未识别到快递公司，请手动补充公司代码或稍后重试", "com", "");
        }

        Map<String, Object> last = null;
        String usedCom = "";
        for (String c : candidates) {
            last = queryOnce(num, c, phone);
            if (last == null) {
                continue;
            }
            usedCom = c;
            if (hasNonEmptyTrace(last)) {
                if (!last.containsKey("com") || last.get("com") == null || String.valueOf(last.get("com")).isBlank()) {
                    last.put("com", c);
                }
                return Map.of("success", true, "resolved_com", c, "result", last);
            }
            if (isNeedPhone(last)) {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("success", false);
                out.put("code", 408);
                out.put("msg", "该快递公司需要手机号验证，请输入收/寄件人手机号后四位");
                out.put("com", c);
                return out;
            }
        }

        if (last != null && isOk(last)) {
            if (!last.containsKey("com") || last.get("com") == null || String.valueOf(last.get("com")).isBlank()) {
                last.put("com", usedCom);
            }
            return Map.of("success", true, "resolved_com", usedCom, "result", last);
        }

        String msg = resultMessage(last);
        return Map.of("success", false, "code", 500, "msg", msg, "com", usedCom);
    }

    private Map<String, Object> queryOnce(String num, String com, String phone) {
        Map<String, String> cfg = loadConfig();
        try {
            Map<String, Object> param = new LinkedHashMap<>();
            param.put("com", com);
            param.put("num", num);
            if (!phone.isBlank()) {
                param.put("phone", phone);
            }
            String paramJson = objectMapper.writeValueAsString(param);
            String sign = md5Upper(paramJson + cfg.get("key") + cfg.get("customer"));
            String body = "customer=" + urlEncode(cfg.get("customer"))
                    + "&param=" + urlEncode(paramJson)
                    + "&sign=" + urlEncode(sign);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(cfg.get("url")))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || response.body().isBlank()) {
                return null;
            }
            return objectMapper.readValue(response.body(), new TypeReference<>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> buildComCandidates(String num, String com) {
        List<String> tryList = new ArrayList<>();
        if (!com.isBlank() && !tryList.contains(com)) {
            tryList.add(com);
        }
        for (String c : autoComs(num)) {
            if (!c.isBlank() && !tryList.contains(c)) {
                tryList.add(c);
            }
        }
        String detected = localGuessCom(num);
        if (detected != null && !detected.isBlank() && !tryList.contains(detected)) {
            tryList.add(detected);
        }
        return tryList;
    }

    private List<String> autoComs(String num) {
        Map<String, String> cfg = loadConfig();
        if (cfg.get("customer").isBlank()) {
            return List.of();
        }
        try {
            String url = "https://www.kuaidi100.com/autonumber/auto?num="
                    + urlEncode(num) + "&key=" + urlEncode(cfg.get("customer"));
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(10)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.body().isBlank()) {
                return List.of();
            }
            Object data = objectMapper.readValue(response.body(), Object.class);
            List<String> out = new ArrayList<>();
            if (data instanceof Map<?, ?> map && map.get("comCode") instanceof String s) {
                out.add(s.trim());
            } else if (data instanceof List<?> list) {
                for (Object row : list) {
                    if (row instanceof Map<?, ?> m && m.get("comCode") != null) {
                        out.add(String.valueOf(m.get("comCode")).trim());
                    }
                }
            }
            return out.stream().filter(s -> !s.isBlank()).distinct().toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private String localGuessCom(String trackingNumber) {
        String t = trackingNumber == null ? "" : trackingNumber.trim().toUpperCase();
        if (t.isEmpty()) {
            return null;
        }
        String pure = t.replaceAll("[^0-9]", "");
        if (t.startsWith("SF") || pure.length() == 12 || pure.length() == 15) {
            if (t.startsWith("SF") || pure.length() == 12) {
                return "shunfeng";
            }
        }
        if (t.startsWith("JD") || pure.length() == 15) {
            return "jd";
        }
        if (t.startsWith("YT")) {
            return "yuantong";
        }
        if (t.startsWith("ZTO")) {
            return "zhongtong";
        }
        if (t.startsWith("YD")) {
            return "yunda";
        }
        if (t.startsWith("STO")) {
            return "shentong";
        }
        return null;
    }

    private boolean isOk(Map<String, Object> r) {
        return r != null && "200".equals(String.valueOf(r.get("status")));
    }

    private boolean hasNonEmptyTrace(Map<String, Object> r) {
        if (!isOk(r)) {
            return false;
        }
        Object data = r.get("data");
        return data instanceof List<?> list && !list.isEmpty();
    }

    private boolean isNeedPhone(Map<String, Object> r) {
        if (r == null) {
            return false;
        }
        if ("408".equals(String.valueOf(r.get("returnCode")))) {
            return true;
        }
        String m = String.valueOf(r.getOrDefault("message", ""));
        return m.contains("验证码错误") || m.contains("手机号");
    }

    private String resultMessage(Map<String, Object> r) {
        if (r == null) {
            return "快递100 查询失败或被限制，请稍后再试。";
        }
        if (r.get("message") != null && !String.valueOf(r.get("message")).isBlank()) {
            return String.valueOf(r.get("message"));
        }
        if (r.get("returnCode") != null) {
            return "快递100 返回错误代码：" + r.get("returnCode");
        }
        return "查询失败";
    }

    private Map<String, String> loadConfig() {
        Map<String, String> defaults = new LinkedHashMap<>();
        defaults.put("customer", "");
        defaults.put("key", "");
        defaults.put("url", "https://poll.kuaidi100.com/poll/query.do");
        Map<String, Object> json = fileJsonStore.read(
                Path.of(properties.getDataDir(), "express_config.json"),
                new TypeReference<>() {},
                Map.of()
        );
        for (String k : List.of("customer", "key", "url")) {
            Object v = json.get(k);
            if (v != null && !String.valueOf(v).isBlank()) {
                defaults.put(k, String.valueOf(v).trim());
            }
        }
        return defaults;
    }

    private static String md5Upper(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString().toUpperCase();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String urlEncode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
