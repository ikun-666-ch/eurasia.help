package com.eurasia.nursery.mapper;

import com.eurasia.nursery.domain.model.RoleView;
import com.eurasia.nursery.domain.model.UserView;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface SysUserMapper {

    @Select("""
            SELECT u.id, u.username, u.display_name AS displayName, u.password_hash AS passwordHash,
                   u.role_id AS roleId, u.status, u.last_login_at AS lastLoginAt, u.phone,
                   u.extra_page_access AS extraPageAccess,
                   r.code AS roleCode, r.name AS roleName
            FROM sys_user u JOIN sys_role r ON r.id = u.role_id
            WHERE u.username = #{username} LIMIT 1
            """)
    UserView findByUsername(String username);

    @Select("""
            SELECT u.id, u.username, u.display_name AS displayName, u.password_hash AS passwordHash,
                   u.role_id AS roleId, u.status, u.last_login_at AS lastLoginAt, u.phone,
                   u.extra_page_access AS extraPageAccess,
                   r.code AS roleCode, r.name AS roleName
            FROM sys_user u JOIN sys_role r ON r.id = u.role_id
            WHERE u.phone = #{phone} LIMIT 1
            """)
    UserView findByPhone(String phone);

    @Select("""
            SELECT u.id, u.username, u.display_name AS displayName, u.password_hash AS passwordHash,
                   u.role_id AS roleId, u.status, u.last_login_at AS lastLoginAt, u.phone,
                   u.extra_page_access AS extraPageAccess,
                   r.code AS roleCode, r.name AS roleName
            FROM sys_user u JOIN sys_role r ON r.id = u.role_id
            WHERE u.id = #{id} LIMIT 1
            """)
    UserView findById(Long id);

    @Select("SELECT id FROM sys_user WHERE username = #{username} LIMIT 1")
    Long findIdByUsername(String username);

    @Update("""
            UPDATE sys_user SET status = 'ONLINE', last_login_at = NOW()
            WHERE id = #{id} AND status != 'DISABLED'
            """)
    int touchOnlineWithLogin(Long id);

    @Update("UPDATE sys_user SET status = 'ONLINE' WHERE id = #{id} AND status != 'DISABLED'")
    int touchOnline(Long id);

    @Update("UPDATE sys_user SET status = 'OFFLINE' WHERE id = #{id}")
    int markOffline(Long id);

    @Update("UPDATE sys_user SET password_hash = #{hash} WHERE id = #{id}")
    int updatePassword(@Param("id") Long id, @Param("hash") String hash);

    @Update("UPDATE sys_user SET phone = #{phone} WHERE id = #{id}")
    int updatePhone(@Param("id") Long id, @Param("phone") String phone);

    @Update("""
            UPDATE sys_user SET display_name = #{displayName}, username = #{username}
            WHERE id = #{id}
            """)
    int updateProfile(@Param("id") Long id, @Param("username") String username, @Param("displayName") String displayName);

    @Update("""
            UPDATE sys_user SET display_name = #{displayName}
            WHERE id = #{id}
            """)
    int updateDisplayName(@Param("id") Long id, @Param("displayName") String displayName);

    @Update("""
            UPDATE sys_user SET username = #{username}
            WHERE id = #{id}
            """)
    int updateUsername(@Param("id") Long id, @Param("username") String username);

    @Insert("""
            INSERT INTO sys_user (username, display_name, password_hash, role_id, status, phone, extra_page_access)
            VALUES (#{username}, #{displayName}, #{passwordHash}, #{roleId}, #{status}, #{phone}, '[]')
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(UserView user);

    @Select("SELECT id FROM sys_user WHERE username = #{username} AND id != #{excludeId} LIMIT 1")
    Long findOtherByUsername(@Param("username") String username, @Param("excludeId") Long excludeId);

    @Select("""
            SELECT u.id, u.username, u.display_name AS displayName, u.password_hash AS passwordHash,
                   u.role_id AS roleId, u.status, u.last_login_at AS lastLoginAt, u.phone,
                   u.extra_page_access AS extraPageAccess,
                   r.code AS roleCode, r.name AS roleName
            FROM sys_user u JOIN sys_role r ON r.id = u.role_id
            ORDER BY u.id
            """)
    List<UserView> listAllWithRole();

    @Delete("DELETE FROM sys_user WHERE id = #{id}")
    int deleteById(Long id);

    @Select("""
            SELECT COUNT(*) FROM sys_user u JOIN sys_role r ON r.id = u.role_id WHERE r.code = 'ADMIN'
            """)
    int countAdmins();

    @Select("""
            SELECT r.code FROM sys_user u JOIN sys_role r ON r.id = u.role_id WHERE u.id = #{id}
            """)
    String findRoleCodeByUserId(Long id);

    @Update("UPDATE sys_user SET display_name = #{displayName}, role_id = #{roleId}, status = #{status}, phone = #{phone}, extra_page_access = #{extraPageAccess} WHERE id = #{id}")
    int updateAdminFields(@Param("id") Long id, @Param("displayName") String displayName, @Param("roleId") Long roleId,
                          @Param("status") String status, @Param("phone") String phone, @Param("extraPageAccess") String extraPageAccess);

    @Select("SELECT id FROM sys_role WHERE id = #{roleId}")
    Long roleExists(Long roleId);
}
