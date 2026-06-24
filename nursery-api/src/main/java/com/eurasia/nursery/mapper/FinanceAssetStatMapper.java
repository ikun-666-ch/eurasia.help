package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface FinanceAssetStatMapper {

    @Select("""
            SELECT label, value, label2, value2, unit, sort_order AS sortOrder
            FROM nursery_asset_stat WHERE city = #{city} ORDER BY sort_order
            """)
    List<Map<String, Object>> listByCity(String city);

    @Select("""
            SELECT label, SUM(value) AS value, label2, SUM(value2) AS value2, unit, sort_order AS sortOrder
            FROM nursery_asset_stat GROUP BY label, label2, unit, sort_order ORDER BY sort_order
            """)
    List<Map<String, Object>> listAggregated();

    @Delete("DELETE FROM nursery_asset_stat WHERE city = #{city}")
    int deleteByCity(String city);

    @Insert("""
            INSERT INTO nursery_asset_stat (city, label, value, label2, value2, unit, sort_order)
            VALUES (#{city}, #{label}, #{value}, #{label2}, #{value2}, #{unit}, #{sortOrder})
            """)
    int insert(@Param("city") String city, @Param("label") String label, @Param("value") BigDecimal value,
               @Param("label2") String label2, @Param("value2") BigDecimal value2,
               @Param("unit") String unit, @Param("sortOrder") int sortOrder);
}
