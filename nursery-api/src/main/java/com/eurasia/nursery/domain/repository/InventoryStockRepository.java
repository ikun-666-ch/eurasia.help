package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.InventoryStock;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryStockRepository extends JpaRepository<InventoryStock, Long> {
}
