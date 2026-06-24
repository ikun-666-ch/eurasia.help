package com.eurasia.nursery.dto;

import java.time.LocalDateTime;

public record UserDto(
        Long id,
        String displayName,
        Long roleId,
        String roleName,
        String status,
        LocalDateTime lastLoginAt) {}
