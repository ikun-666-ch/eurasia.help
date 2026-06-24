package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.SysUser;
import com.eurasia.nursery.domain.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SysUserRepository extends JpaRepository<SysUser, Long> {
    Optional<SysUser> findByUsername(String username);
    long countByStatus(UserStatus status);
    long countByRoleId(Long roleId);
}
