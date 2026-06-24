package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.InventorySku;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InventorySkuRepository extends JpaRepository<InventorySku, Long> {
    Optional<InventorySku> findByVarietyAndSpecification(String variety, String specification);
}
