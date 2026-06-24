package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface FinanceSettingsMapper {

    @Select("SELECT * FROM finance_settings WHERE id = 1")
    Map<String, Object> findSettings();

    @Update("""
            UPDATE finance_settings SET growth_rate_cumulative = #{cum}, growth_rate_yoy = #{yoy},
            q1_share = #{q1}, q2_share = #{q2}, q3_share = #{q3}, q4_share = #{q4} WHERE id = 1
            """)
    int updateSettings(@Param("cum") BigDecimal cum, @Param("yoy") BigDecimal yoy,
                       @Param("q1") BigDecimal q1, @Param("q2") BigDecimal q2,
                       @Param("q3") BigDecimal q3, @Param("q4") BigDecimal q4);
}
