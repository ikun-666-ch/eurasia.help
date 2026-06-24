package com.eurasia.nursery.dto;

import java.math.BigDecimal;

public record FinanceMonthRequest(
        String yearMonth, BigDecimal revenue, BigDecimal profit, BigDecimal assetValue) {}
