package com.eurasia.nursery.dto;

import java.math.BigDecimal;

public record InventoryLedgerDto(
        Long id,
        String variety,
        String specification,
        BigDecimal quantity,
        String city
) {}
