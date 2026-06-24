package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.util.Map;

@Mapper
public interface SystemSettingsMapper {

    @Select("SELECT auto_fill_enabled AS autoFillEnabled, last_auto_fill_date AS lastAutoFillDate FROM system_settings WHERE id = 1")
    Map<String, Object> getSettings();

    @Update("UPDATE system_settings SET auto_fill_enabled = #{enabled} WHERE id = 1")
    int setAutoFillEnabled(@Param("enabled") int enabled);

    @Update("UPDATE system_settings SET last_auto_fill_date = #{date} WHERE id = 1")
    int setLastAutoFillDate(@Param("date") String date);
}
