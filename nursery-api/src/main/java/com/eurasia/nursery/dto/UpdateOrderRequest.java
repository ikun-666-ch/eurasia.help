package com.eurasia.nursery.dto;

import java.math.BigDecimal;

public record UpdateOrderRequest(String status, BigDecimal totalAmount, Integer satisfaction) {}
