package com.eurasia.nursery.dto;

public record UpsertCategoryRequest(String name, Long parentId, Integer level, Integer sortOrder) {}
