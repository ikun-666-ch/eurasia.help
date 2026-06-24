package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface FinanceMonthlyMapper {

    @Select("SELECT id FROM finance_monthly WHERE `year_month` = #{ym}")
    Long findIdByMonth(String ym);

    @Update("UPDATE finance_monthly SET revenue = revenue + #{revenue}, cost = cost + #{cost}, profit = profit + #{profit} WHERE `year_month` = #{ym}")
    int addToMonth(@Param("ym") String ym, @Param("revenue") BigDecimal revenue,
                   @Param("cost") BigDecimal cost, @Param("profit") BigDecimal profit);

    @Insert("INSERT INTO finance_monthly (`year_month`, revenue, cost, profit, asset_value) VALUES (#{ym}, #{revenue}, #{cost}, #{profit}, 0)")
    int insertMonth(@Param("ym") String ym, @Param("revenue") BigDecimal revenue,
                    @Param("cost") BigDecimal cost, @Param("profit") BigDecimal profit);

    @Select("SELECT id FROM finance_monthly_city WHERE `year_month` = #{ym} AND city = #{city}")
    Long findCityId(@Param("ym") String ym, @Param("city") String city);

    @Update("UPDATE finance_monthly_city SET revenue = revenue + #{revenue}, profit = profit + #{profit} WHERE `year_month` = #{ym} AND city = #{city}")
    int addToCityMonth(@Param("ym") String ym, @Param("city") String city,
                       @Param("revenue") BigDecimal revenue, @Param("profit") BigDecimal profit);

    @Insert("INSERT INTO finance_monthly_city (`year_month`, city, revenue, profit, asset_value) VALUES (#{ym}, #{city}, #{revenue}, #{profit}, 0)")
    int insertCityMonth(@Param("ym") String ym, @Param("city") String city,
                        @Param("revenue") BigDecimal revenue, @Param("profit") BigDecimal profit);

    @Select("SELECT * FROM finance_monthly ORDER BY `year_month`")
    List<Map<String, Object>> listAll();

    @Select("SELECT * FROM finance_monthly_city WHERE city = #{city} ORDER BY `year_month`")
    List<Map<String, Object>> listByCity(String city);

    @Select("SELECT id, `year_month` AS yearMonth FROM finance_monthly ORDER BY `year_month` DESC LIMIT 1")
    Map<String, Object> findLatest();

    @Update("UPDATE finance_monthly SET revenue = #{revenue}, profit = #{profit}, cost = #{cost} WHERE `year_month` = #{ym}")
    int updateMonth(@Param("ym") String ym, @Param("revenue") BigDecimal revenue,
                    @Param("profit") BigDecimal profit, @Param("cost") BigDecimal cost);

    @Update("UPDATE finance_monthly SET asset_value = #{assetValue} WHERE `year_month` = #{ym}")
    int updateAssetByMonth(@Param("ym") String ym, @Param("assetValue") BigDecimal assetValue);

    @Update("UPDATE finance_monthly SET asset_value = #{assetValue} WHERE id = #{id}")
    int updateAssetById(@Param("id") Long id, @Param("assetValue") BigDecimal assetValue);

    @Update("""
            UPDATE finance_monthly_city SET asset_value = #{assetValue}
            WHERE city = #{city} AND `year_month` = (
                SELECT t.ym FROM (SELECT `year_month` AS ym FROM finance_monthly_city WHERE city = #{city} ORDER BY `year_month` DESC LIMIT 1) t
            )
            """)
    int updateCityLatestAsset(@Param("city") String city, @Param("assetValue") BigDecimal assetValue);
}
