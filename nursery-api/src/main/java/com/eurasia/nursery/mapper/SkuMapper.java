package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface SkuMapper {

    @Select("""
            SELECT sk.id, sk.variety, sk.specification, sk.category_id AS categoryId, c.name AS categoryName
            FROM inventory_sku sk
            LEFT JOIN seedling_category c ON c.id = sk.category_id
            ORDER BY sk.variety, sk.specification
            """)
    List<Map<String, Object>> listAll();

    @Select("""
            SELECT sk.id, sk.variety, sk.specification, sk.category_id AS categoryId, c.name AS categoryName
            FROM inventory_sku sk
            LEFT JOIN seedling_category c ON c.id = sk.category_id
            WHERE sk.id = #{id}
            """)
    Map<String, Object> findById(Long id);

    @Select("SELECT variety, specification FROM inventory_sku ORDER BY variety, specification")
    List<Map<String, Object>> catalogRows();

    @Select("SELECT id FROM inventory_sku WHERE variety = #{variety} AND specification = #{specification} LIMIT 1")
    Long findDuplicate(@Param("variety") String variety, @Param("specification") String specification);

    @Select("SELECT id FROM inventory_sku WHERE variety = #{variety} AND specification = #{specification} AND id <> #{excludeId} LIMIT 1")
    Long findDuplicateExclude(@Param("variety") String variety, @Param("specification") String specification, @Param("excludeId") Long excludeId);

    @Insert("INSERT INTO inventory_sku (variety, specification, category_id) VALUES (#{variety}, #{specification}, #{categoryId})")
    int insert(@Param("variety") String variety, @Param("specification") String specification, @Param("categoryId") Long categoryId);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Update("UPDATE inventory_sku SET variety = #{variety}, specification = #{specification}, category_id = #{categoryId} WHERE id = #{id}")
    int update(@Param("id") Long id, @Param("variety") String variety, @Param("specification") String specification, @Param("categoryId") Long categoryId);

    @Select("SELECT COUNT(*) FROM inventory_stock WHERE sku_id = #{skuId}")
    int countStockBySku(Long skuId);

    @Delete("DELETE FROM inventory_sku WHERE id = #{id}")
    int delete(Long id);
}
