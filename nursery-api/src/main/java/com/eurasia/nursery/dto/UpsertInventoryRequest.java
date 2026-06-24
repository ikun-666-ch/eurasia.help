package com.eurasia.nursery.dto;

import java.math.BigDecimal;

public record UpsertInventoryRequest(
        String variety, String specification, BigDecimal quantity, String city, String warehouse) {}
