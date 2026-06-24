package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.PanelConfigMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class PanelService {

    private final PanelConfigMapper panelConfigMapper;
    private final PageAccessService pageAccessService;
    private final ObjectMapper objectMapper;

    public PanelService(PanelConfigMapper panelConfigMapper, PageAccessService pageAccessService,
                        ObjectMapper objectMapper) {
        this.panelConfigMapper = panelConfigMapper;
        this.pageAccessService = pageAccessService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> get(String key) {
        String payload = panelConfigMapper.findPayload(key);
        if (payload == null || payload.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(payload, new TypeReference<>() {});
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> save(UserView user, String key, Map<String, Object> body) {
        if (!pageAccessService.canEditPanel(user, key)) {
            throw new BusinessException("无权编辑该面板", 403);
        }
        Object payloadObj = body.get("payload");
        if (!(payloadObj instanceof Map<?, ?> payloadMap)) {
            payloadObj = Map.of();
        }
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payloadObj);
        } catch (Exception e) {
            throw new BusinessException("payload 格式无效");
        }
        if (panelConfigMapper.findKey(key) != null) {
            panelConfigMapper.update(key, payloadJson);
        } else {
            panelConfigMapper.insert(key, payloadJson);
        }
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {});
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }
}
