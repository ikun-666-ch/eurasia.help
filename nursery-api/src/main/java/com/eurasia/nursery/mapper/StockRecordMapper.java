package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;

@Mapper
public interface StockRecordMapper {

    @Insert("""
            INSERT INTO stock_record (sku_id, record_type, quantity, remark, operator_id, media)
            VALUES (#{skuId}, #{recordType}, #{quantity}, #{remark}, #{operatorId}, #{media})
            """)
    int insert(@Param("skuId") Long skuId, @Param("recordType") String recordType,
               @Param("quantity") BigDecimal quantity, @Param("remark") String remark,
               @Param("operatorId") Long operatorId, @Param("media") String media);
}
