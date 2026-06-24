package com.eurasia.nursery.dto;

public record RoleDto(
        Long id,
        String name,
        String permissions,
        long userCount
) {}
