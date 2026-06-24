package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface CustomerMapper {

    @Select("SELECT * FROM customer ORDER BY id")
    List<Map<String, Object>> listAll();

    @Select("SELECT * FROM customer WHERE id = #{id}")
    Map<String, Object> findById(Long id);

    @Select("""
            <script>SELECT id, name, contact_name, region, district, level, phone FROM customer WHERE 1=1
            <if test="city != null and city != ''"> AND region = #{city}</if>
            <if test="district != null and district != ''"> AND district = #{district}</if>
            ORDER BY name ASC, id ASC</script>
            """)
    List<Map<String, Object>> listForSales(@Param("city") String city, @Param("district") String district);

    @Update("UPDATE customer SET name = #{name}, region = #{region}, district = #{district} WHERE id = #{id}")
    int updateRegionFields(@Param("id") Long id, @Param("name") String name, @Param("region") String region,
                           @Param("district") String district);

    @Insert("""
            INSERT INTO customer (name, contact_name, region, district, level, phone)
            VALUES (#{name}, #{contactName}, #{region}, #{district}, #{level}, #{phone})
            """)
    int insert(@Param("name") String name, @Param("contactName") String contactName, @Param("region") String region,
               @Param("district") String district, @Param("level") String level, @Param("phone") String phone);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Update("""
            UPDATE customer SET name = #{name}, contact_name = #{contactName}, region = #{region},
            district = #{district}, level = #{level}, phone = #{phone} WHERE id = #{id}
            """)
    int updateFull(Map<String, Object> row);

    @Delete("DELETE FROM customer WHERE id = #{id}")
    int delete(Long id);
}
