package com.eurasia.nursery.service;

import com.eurasia.nursery.config.NurseryProperties;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Component
public class IhuyiSmsClient {

    private final NurseryProperties properties;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();

    public IhuyiSmsClient(NurseryProperties properties) {
        this.properties = properties;
    }

    public record SendResult(boolean ok, String message) {}

    public SendResult send(String mobile, String code) {
        String account = properties.getIhuyi().getAccount().trim();
        String password = properties.getIhuyi().getPassword().trim();
        if (account.isEmpty() || password.isEmpty()) {
            return new SendResult(false, "未配置短信服务");
        }
        if (mobile == null || mobile.isBlank()) {
            return new SendResult(false, "手机号格式不正确");
        }
        try {
            String content = "您的验证码是：" + code + "。请不要把验证码泄露给其他人。";
            String body = buildForm(Map.of(
                    "account", account,
                    "password", password,
                    "mobile", mobile,
                    "content", content
            ));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://106.ihuyi.com/webservice/sms.php?method=Submit&format=json"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.body() == null || response.body().isBlank()) {
                return new SendResult(false, "短信服务异常");
            }
            if (response.body().contains("\"code\":2")) {
                return new SendResult(true, "验证码已发送");
            }
            return new SendResult(false, "发送失败");
        } catch (Exception e) {
            return new SendResult(false, "短信服务异常");
        }
    }

    private String buildForm(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        params.forEach((k, v) -> {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(k, StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(v, StandardCharsets.UTF_8));
        });
        return sb.toString();
    }
}
