package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface InventoryStockMapper {

    @Select("""
            SELECT s.id, sk.variety, sk.specification, s.quantity, s.city, s.warehouse, s.sku_id AS skuId
            FROM inventory_stock s JOIN inventory_sku sk ON sk.id = s.sku_id ORDER BY s.id
            """)
    List<Map<String, Object>> listLedger();

    @Select("""
            SELECT s.id, sk.variety, sk.specification, s.quantity, s.city, s.warehouse, s.sku_id AS skuId
            FROM inventory_stock s JOIN inventory_sku sk ON sk.id = s.sku_id WHERE s.id = #{id}
            """)
    Map<String, Object> findLedgerById(Long id);

    @Select("SELECT * FROM inventory_stock WHERE id = #{id}")
    Map<String, Object> findById(Long id);

    @Insert("""
            INSERT INTO inventory_stock (sku_id, warehouse, city, quantity)
            VALUES (#{skuId}, #{warehouse}, #{city}, #{quantity})
            """)
    int insert(@Param("skuId") Long skuId, @Param("warehouse") String warehouse,
               @Param("city") String city, @Param("quantity") BigDecimal quantity);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Update("""
            UPDATE inventory_stock SET city = #{city}, warehouse = #{warehouse}, quantity = #{quantity}
            WHERE id = #{id}
            """)
    int update(@Param("id") Long id, @Param("city") String city, @Param("warehouse") String warehouse,
               @Param("quantity") BigDecimal quantity);

    @Update("UPDATE inventory_stock SET city = #{city} WHERE id = #{id}")
    int updateCity(@Param("id") Long id, @Param("city") String city);

    @Update("UPDATE inventory_stock SET warehouse = #{warehouse} WHERE id = #{id}")
    int updateWarehouse(@Param("id") Long id, @Param("warehouse") String warehouse);

    @Update("UPDATE inventory_stock SET quantity = #{quantity} WHERE id = #{id}")
    int updateQuantity(@Param("id") Long id, @Param("quantity") BigDecimal quantity);

    @Delete("DELETE FROM inventory_stock WHERE id = #{id}")
    int delete(Long id);

    @Select("""
            SELECT id, quantity FROM inventory_stock
            WHERE sku_id = #{skuId} AND (#{city} = '' OR city = #{city})
            ORDER BY quantity DESC LIMIT 1
            """)
    Map<String, Object> findStockForShip(@Param("skuId") Long skuId, @Param("city") String city);

    @Select("""
            SELECT id, quantity, city FROM inventory_stock
            WHERE sku_id = #{skuId} AND quantity > 0
            ORDER BY quantity DESC LIMIT 1
            """)
    Map<String, Object> findAnyStockForShip(@Param("skuId") Long skuId);

    @Update("UPDATE inventory_stock SET quantity = quantity - #{qty} WHERE id = #{id}")
    int deductQuantity(@Param("id") Long id, @Param("qty") BigDecimal qty);

    @Update("UPDATE inventory_stock SET quantity = quantity + #{qty} WHERE id = #{id}")
    int addQuantity(@Param("id") Long id, @Param("qty") BigDecimal qty);

    @Select("""
            SELECT id FROM inventory_stock
            WHERE sku_id = #{skuId} AND (#{city} = '' OR city = #{city})
            ORDER BY id DESC LIMIT 1
            """)
    Long findStockIdForRestock(@Param("skuId") Long skuId, @Param("city") String city);

    @Select("SELECT COALESCE(SUM(quantity), 0) FROM inventory_stock")
    java.math.BigDecimal sumQuantity();
}
