package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface FinanceSalesDistrictMapper {

    @Select("""
            SELECT district, amount FROM finance_sales_district
            WHERE city = #{city} ORDER BY amount DESC, sort_order ASC LIMIT 5
            """)
    List<Map<String, Object>> topByCity(String city);
}
