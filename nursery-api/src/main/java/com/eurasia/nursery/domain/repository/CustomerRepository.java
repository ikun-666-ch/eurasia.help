package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    long countByCreatedAtAfter(LocalDateTime time);
}
