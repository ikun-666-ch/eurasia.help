package com.eurasia.nursery.domain.repository;

import com.eurasia.nursery.domain.entity.SeedlingCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SeedlingCategoryRepository extends JpaRepository<SeedlingCategory, Long> {
    List<SeedlingCategory> findByParentIdIsNullOrderBySortOrderAsc();
    List<SeedlingCategory> findByParentIdOrderBySortOrderAsc(Long parentId);
}
