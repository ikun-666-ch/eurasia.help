package com.eurasia.nursery.dto;

import java.util.List;

public record CategoryDto(
        Long id,
        String name,
        Integer level,
        List<CategoryDto> children
) {}
