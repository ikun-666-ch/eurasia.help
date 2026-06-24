package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** AI 对话数据上下文查询，对齐 PHP buildDataContext */
@Mapper
public interface AiDataContextMapper {

    @Select("SELECT COUNT(*) FROM inventory_sku")
    int countSkus();

    @Select("SELECT COALESCE(SUM(quantity), 0) FROM inventory_stock")
    BigDecimal totalStock();

    @Select("""
            SELECT c.name, COUNT(s.id) AS cnt
            FROM seedling_category c
            LEFT JOIN inventory_sku s ON s.category_id = c.id
            GROUP BY c.id ORDER BY cnt DESC
            """)
    List<Map<String, Object>> categoryCounts();

    @Select("""
            SELECT s.variety, s.specification, c.name AS cat, COALESCE(SUM(st.quantity), 0) AS stock
            FROM inventory_sku s
            LEFT JOIN seedling_category c ON s.category_id = c.id
            LEFT JOIN inventory_stock st ON st.sku_id = s.id
            GROUP BY s.id ORDER BY stock DESC
            """)
    List<Map<String, Object>> skuStockBreakdown();

    @Select("SELECT COUNT(*) FROM sales_order")
    int countOrders();

    @Select("SELECT COALESCE(SUM(total_amount), 0) FROM sales_order")
    BigDecimal totalSalesAmount();

    @Select("""
            SELECT COALESCE(SUM(total_amount), 0) FROM sales_order
            WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
            """)
    BigDecimal thisMonthSales();

    @Select("SELECT COUNT(*) FROM sales_order WHERE status = 'CONFIRMED'")
    int pendingOrders();

    @Select("SELECT COUNT(*) FROM sales_order WHERE status = 'SHIPPING'")
    int shippedOrders();

    @Select("""
            SELECT COALESCE(SUM(total_amount), 0) FROM sales_order
            WHERE status IN ('SHIPPING', 'DONE')
            """)
    BigDecimal totalRevenue();

    @Select("""
            SELECT COALESCE(SUM(total_amount), 0) FROM sales_order
            WHERE status IN ('SHIPPING', 'DONE')
              AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
            """)
    BigDecimal thisMonthRevenue();

    @Select("SELECT COALESCE(SUM(value), 0) FROM nursery_asset_stat")
    BigDecimal totalAssetValue();
}
