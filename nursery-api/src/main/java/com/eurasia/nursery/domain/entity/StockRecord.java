package com.eurasia.nursery.domain.entity;

import com.eurasia.nursery.domain.enums.StockRecordType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_record")
public class StockRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sku_id", nullable = false)
    private InventorySku sku;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", nullable = false, length = 16)
    private StockRecordType recordType;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal quantity;

    @Column(length = 255)
    private String remark;

    @Column(name = "operator_id")
    private Long operatorId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public InventorySku getSku() { return sku; }
    public void setSku(InventorySku sku) { this.sku = sku; }
    public StockRecordType getRecordType() { return recordType; }
    public void setRecordType(StockRecordType recordType) { this.recordType = recordType; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public Long getOperatorId() { return operatorId; }
    public void setOperatorId(Long operatorId) { this.operatorId = operatorId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
