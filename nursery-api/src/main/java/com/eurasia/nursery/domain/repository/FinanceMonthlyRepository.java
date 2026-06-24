package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.FinanceMonthly;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinanceMonthlyRepository extends JpaRepository<FinanceMonthly, Long> {
    List<FinanceMonthly> findAllByOrderByYearMonthAsc();

    Optional<FinanceMonthly> findByYearMonth(String yearMonth);
}
