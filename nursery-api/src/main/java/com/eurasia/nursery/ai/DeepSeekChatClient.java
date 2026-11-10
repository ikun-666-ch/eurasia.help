package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.config.NurseryProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
public class DeepSeekChatClient implements ChatCompletionClient {

    private final NurseryProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public DeepSeekChatClient(NurseryProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public JsonNode complete(ObjectNode payload) {
        NurseryProperties.DeepSeek deepSeek = properties.getDeepseek();
        String apiKey = deepSeek.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("AI 服务未配置");
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(deepSeek.getApiUrl()))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            var future = httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString());
            HttpResponse<String> response;
            try {
                while (true) {
                    if (AiCallScope.cancelled()) {
                        future.cancel(true);
                        throw new BusinessException("已停止");
                    }
                    try {
                        response = future.get(200, TimeUnit.MILLISECONDS);
                        break;
                    } catch (TimeoutException ignored) {
                        // keep waiting until the model returns or the user stops
                    }
                }
            } catch (BusinessException e) {
                throw e;
            } catch (Exception e) {
                future.cancel(true);
                Throwable cause = e.getCause() == null ? e : e.getCause();
                throw new BusinessException("AI 服务请求失败：" + cause.getMessage());
            }
            JsonNode data = objectMapper.readTree(response.body());
            if (response.statusCode() != 200 || data.has("error")) {
                String errMsg = data.path("error").path("message").asText("HTTP " + response.statusCode());
                throw new BusinessException("AI 返回错误：" + errMsg);
            }
            return data;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("AI 服务请求失败：" + e.getMessage());
        }
    }
}
