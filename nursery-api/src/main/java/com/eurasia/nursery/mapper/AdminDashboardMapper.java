package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface AdminDashboardMapper {

    @Select("SELECT COUNT(*) FROM sys_user")
    int countUsers();

    @Select("SELECT COUNT(*) FROM sys_user WHERE status = 'ONLINE'")
    int countOnlineUsers();

    @Select("SELECT id, name FROM sys_role ORDER BY id")
    List<Map<String, Object>> listRolesBrief();

    @Select("SELECT COUNT(*) FROM sys_user WHERE role_id = #{roleId}")
    int countUsersByRole(Long roleId);

    @Select("SELECT COUNT(*) FROM inventory_sku")
    int countSkus();

    @Select("SELECT variety, COUNT(*) AS cnt FROM inventory_sku GROUP BY variety ORDER BY variety")
    List<Map<String, Object>> varietyCounts();

    @Select("SELECT COUNT(*) FROM customer")
    int countCustomers();

    @Select("SELECT COUNT(*) FROM customer WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    int countNewCustomersThisWeek();
}
