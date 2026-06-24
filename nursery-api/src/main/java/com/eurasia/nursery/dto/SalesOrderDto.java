package com.eurasia.nursery.dto;

import java.math.BigDecimal;

public record SalesOrderDto(
        Long id,
        String orderNo,
        String customerName,
        String status,
        BigDecimal totalAmount,
        Integer satisfaction
) {}
