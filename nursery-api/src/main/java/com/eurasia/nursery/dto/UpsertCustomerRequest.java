package com.eurasia.nursery.dto;

public record UpsertCustomerRequest(
        String name, String contactName, String region, String level, String phone) {}
