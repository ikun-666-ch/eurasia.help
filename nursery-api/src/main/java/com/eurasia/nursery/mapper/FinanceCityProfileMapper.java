package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface FinanceCityProfileMapper {

    @Select("SELECT * FROM finance_city_profile WHERE city = #{city}")
    Map<String, Object> findByCity(String city);
}
