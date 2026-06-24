package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.SysRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SysRoleRepository extends JpaRepository<SysRole, Long> {
    Optional<SysRole> findByCode(String code);
}
