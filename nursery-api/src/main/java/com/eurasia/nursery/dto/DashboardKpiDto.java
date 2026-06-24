package com.eurasia.nursery.dto;

import java.util.List;

public record DashboardKpiDto(
        long userCount,
        long activeToday,
        long roleCount,
        List<RoleUserSlice> roleUsers,
        long categoryNodeCount,
        List<CategorySlice> categorySlices,
        long customerCount,
        long newCustomersThisWeek,
        double systemUptimePercent
) {
    public record RoleUserSlice(String name, long value) {}
    public record CategorySlice(String name, long value) {}
}
