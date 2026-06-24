package com.eurasia.nursery.service;

import com.eurasia.nursery.config.NurseryProperties;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/** 对齐 PHP SystemMetrics */
@Service
public class SystemMetricsService {

    private final NurseryProperties properties;
    private final Kuaidi100Client kuaidi100Client;

    public SystemMetricsService(NurseryProperties properties, Kuaidi100Client kuaidi100Client) {
        this.properties = properties;
        this.kuaidi100Client = kuaidi100Client;
    }

    public Map<String, Object> collect() {
        Runtime rt = Runtime.getRuntime();
        long memoryUsage = rt.totalMemory() - rt.freeMemory();
        long memoryMax = Math.min(rt.maxMemory(), 512L * 1024 * 1024);

        List<Map<String, Object>> cacheItems = new ArrayList<>();
        cacheItems.add(cacheItem("短信验证", Path.of(properties.getDataDir(), "sms_codes.json")));
        cacheItems.add(cacheItem("安全验证", Path.of(properties.getDataDir(), "slide_captcha.json")));
        long cacheTotal = cacheItems.stream().mapToLong(i -> ((Number) i.get("bytes")).longValue()).sum();

        long dataDirBytes = directorySize(Path.of(properties.getDataDir()));

        Double memoryPercent = memoryMax > 0 ? Math.round(memoryUsage * 1000.0 / memoryMax) / 10.0 : null;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("memoryUsageBytes", memoryUsage);
        out.put("memoryPeakBytes", memoryUsage);
        out.put("memoryLimitBytes", memoryMax);
        out.put("memoryUsagePercent", memoryPercent);
        out.put("cacheTotalBytes", cacheTotal);
        out.put("cacheItems", cacheItems);
        out.put("storageBytes", dataDirBytes);
        out.put("apiQuotas", apiQuotas());
        out.put("collectedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return out;
    }

    private List<Map<String, Object>> apiQuotas() {
        List<Map<String, Object>> quotas = new ArrayList<>();
        boolean smsConfigured = properties.getIhuyi().getAccount() != null
                && !properties.getIhuyi().getAccount().isBlank()
                && properties.getIhuyi().getPassword() != null
                && !properties.getIhuyi().getPassword().isBlank();
        Map<String, Object> sms = new LinkedHashMap<>();
        sms.put("label", "短信验证码（互亿）");
        sms.put("configured", smsConfigured);
        sms.put("remaining", null);
        sms.put("unit", "条");
        sms.put("status", smsConfigured ? "normal" : "unconfigured");
        sms.put("message", smsConfigured ? "已配置" : "未配置 auth_config.json 或环境变量");
        quotas.add(sms);

        Map<String, Object> express = new LinkedHashMap<>();
        express.put("label", "快递100物流查询");
        express.put("configured", kuaidi100Client.isConfigured());
        express.put("remaining", null);
        express.put("unit", "次");
        express.put("status", kuaidi100Client.isConfigured() ? "normal" : "unconfigured");
        express.put("message", kuaidi100Client.isConfigured() ? "已配置" : "未配置 express_config.json");
        quotas.add(express);
        return quotas;
    }

    private Map<String, Object> cacheItem(String label, Path path) {
        long bytes = 0;
        if (Files.isRegularFile(path)) {
            try {
                bytes = Files.size(path);
            } catch (IOException ignored) {
            }
        }
        return Map.of("label", label, "bytes", bytes);
    }

    private long directorySize(Path dir) {
        if (!Files.isDirectory(dir)) {
            return 0;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            return walk.filter(Files::isRegularFile).mapToLong(p -> {
                try {
                    return Files.size(p);
                } catch (IOException e) {
                    return 0;
                }
            }).sum();
        } catch (IOException e) {
            return 0;
        }
    }
}
