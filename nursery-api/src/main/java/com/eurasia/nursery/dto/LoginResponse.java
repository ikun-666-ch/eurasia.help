package com.eurasia.nursery.dto;

public record LoginResponse(
        String token,
        String username,
        String displayName,
        String roleCode,
        String roleName
) {}
