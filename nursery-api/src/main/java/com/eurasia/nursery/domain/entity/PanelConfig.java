package com.eurasia.nursery.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "panel_config")
public class PanelConfig {

    @Id
    @Column(name = "panel_key", length = 128)
    private String panelKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payloadJson = "{}";

    public String getPanelKey() { return panelKey; }
    public void setPanelKey(String panelKey) { this.panelKey = panelKey; }
    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }
}
