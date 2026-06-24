package com.eurasia.nursery.dto;

public record CustomerDto(
        Long id,
        String name,
        String contactName,
        String region,
        String level
) {}
