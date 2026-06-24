package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {
}
