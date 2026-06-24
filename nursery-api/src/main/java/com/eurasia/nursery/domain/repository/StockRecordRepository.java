package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.StockRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockRecordRepository extends JpaRepository<StockRecord, Long> {
}
