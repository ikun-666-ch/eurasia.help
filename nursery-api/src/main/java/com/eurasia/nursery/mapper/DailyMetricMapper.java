package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;

@Mapper
public interface DailyMetricMapper {

    @Insert("""
            INSERT INTO daily_metric (series_key, stat_date, city, amount, source)
            VALUES (#{seriesKey}, #{statDate}, #{city}, #{amount}, 'auto')
            ON DUPLICATE KEY UPDATE amount = VALUES(amount), source = VALUES(source)
            """)
    int upsert(@Param("seriesKey") String seriesKey, @Param("statDate") String statDate,
               @Param("city") String city, @Param("amount") BigDecimal amount);

    @Insert("""
            INSERT INTO daily_metric (series_key, stat_date, city, amount, source)
            VALUES (#{seriesKey}, #{statDate}, #{city}, #{amount}, 'manual')
            ON DUPLICATE KEY UPDATE amount = VALUES(amount), source = 'manual'
            """)
    int upsertManual(@Param("seriesKey") String seriesKey, @Param("statDate") String statDate,
                     @Param("city") String city, @Param("amount") BigDecimal amount);

    @Select("SELECT COALESCE(SUM(o.total_amount), 0) FROM sales_order o WHERE DATE(o.created_at) = #{date}")
    BigDecimal salesYuanOnDate(String date);

    @Select("SELECT COALESCE(SUM(o.total_amount), 0) FROM sales_order o WHERE DATE(o.created_at) <= #{date}")
    BigDecimal cumulativeSalesYuan(String date);

    @Select("SELECT city, SUM(quantity) AS qty FROM inventory_stock GROUP BY city")
    @MapKey("city")
    java.util.Map<String, java.util.Map<String, Object>> stockByCity();

    @Select("""
            SELECT amount, source FROM daily_metric
            WHERE series_key = #{seriesKey} AND stat_date = #{statDate} AND city = #{city}
            """)
    java.util.Map<String, Object> loadPoint(@Param("seriesKey") String seriesKey, @Param("statDate") String statDate,
                                            @Param("city") String city);
}
