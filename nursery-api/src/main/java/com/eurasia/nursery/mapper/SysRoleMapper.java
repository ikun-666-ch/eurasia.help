package com.eurasia.nursery.mapper;

import com.eurasia.nursery.domain.model.RoleView;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface SysRoleMapper {

    @Select("SELECT code, name FROM sys_role ORDER BY id")
    List<RoleView> findAll();

    @Select("SELECT id, code, name, permissions FROM sys_role ORDER BY id")
    List<RoleView> findAllDetailed();

    @Select("SELECT id, code, name, permissions FROM sys_role WHERE id = #{id}")
    RoleView findDetailedById(Long id);

    @Select("SELECT id FROM sys_role WHERE code = #{code} LIMIT 1")
    Long findIdByCode(String code);

    @Select("SELECT COUNT(*) FROM sys_user WHERE role_id = #{roleId}")
    int countUsersByRoleId(Long roleId);

    @Update("UPDATE sys_role SET name = #{name}, permissions = #{permissions} WHERE id = #{id}")
    int updateRole(@Param("id") Long id, @Param("name") String name, @Param("permissions") String permissions);
}
