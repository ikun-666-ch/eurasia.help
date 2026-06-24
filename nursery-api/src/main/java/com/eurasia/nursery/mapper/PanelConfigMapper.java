package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

@Mapper
public interface PanelConfigMapper {

    @Select("SELECT payload_json FROM panel_config WHERE panel_key = #{key}")
    String findPayload(String key);

    @Select("SELECT panel_key FROM panel_config WHERE panel_key = #{key}")
    String findKey(String key);

    @Update("UPDATE panel_config SET payload_json = #{payload} WHERE panel_key = #{key}")
    int update(@Param("key") String key, @Param("payload") String payload);

    @Insert("INSERT INTO panel_config (panel_key, payload_json) VALUES (#{key}, #{payload})")
    int insert(@Param("key") String key, @Param("payload") String payload);
}
