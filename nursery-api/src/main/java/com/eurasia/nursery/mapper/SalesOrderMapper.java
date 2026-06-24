package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface SalesOrderMapper {

    String ORDER_SELECT = """
            o.id, o.order_no AS orderNo, o.status, o.rejected_at AS rejectedAt, o.total_amount AS totalAmount,
            o.cost_amount AS costAmount, o.profit_amount AS profitAmount, o.satisfaction,
            o.created_at AS createdAt, o.updated_at AS updatedAt,
            o.tracking_no AS trackingNo, o.tracking_com AS trackingCom, o.variety, o.specification, o.quantity,
            o.salesperson_id AS salespersonId, sp.display_name AS salespersonName,
            c.name AS customerName, c.region AS city, c.district, o.customer_id AS customerId,
            o.media
            """;

    String ORDER_FROM = """
            FROM sales_order o
            JOIN customer c ON c.id = o.customer_id
            LEFT JOIN sys_user sp ON sp.id = o.salesperson_id
            """;

    @Select("SELECT " + ORDER_SELECT + " " + ORDER_FROM + " WHERE c.region = #{city} ORDER BY o.order_no ASC, o.id ASC")
    List<Map<String, Object>> listByCity(String city);

    @Select("SELECT " + ORDER_SELECT + " " + ORDER_FROM
            + " WHERE c.region IS NOT NULL AND c.region != '' ORDER BY o.order_no ASC, o.id ASC")
    List<Map<String, Object>> listAll();

    @Select("SELECT " + ORDER_SELECT + " " + ORDER_FROM + " WHERE o.id = #{id}")
    Map<String, Object> findViewById(Long id);

    @Select("SELECT * FROM sales_order WHERE id = #{id}")
    Map<String, Object> findRawById(Long id);

    @Select("""
            SELECT o.*, c.region AS city FROM sales_order o
            JOIN customer c ON c.id = o.customer_id WHERE o.id = #{id}
            """)
    Map<String, Object> findForWorkflow(Long id);

    @Select("SELECT COUNT(*) FROM sales_order WHERE order_no LIKE CONCAT(#{prefix}, '%')")
    int countByOrderNoPrefix(String prefix);

    @Insert("""
            INSERT INTO sales_order (order_no, customer_id, status, total_amount, satisfaction, salesperson_id, media,
            created_at, updated_at, variety, specification, quantity)
            VALUES (#{orderNo}, #{customerId}, #{status}, #{totalAmount}, NULL, #{salespersonId}, #{media},
            NOW(), NOW(), #{variety}, #{specification}, #{quantity})
            """)
    int insert(@Param("orderNo") String orderNo, @Param("customerId") Long customerId, @Param("status") String status,
               @Param("totalAmount") BigDecimal totalAmount, @Param("salespersonId") Long salespersonId,
               @Param("variety") String variety, @Param("specification") String specification,
               @Param("quantity") int quantity, @Param("media") String media);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Update("UPDATE sales_order SET status = #{status}, rejected_at = #{rejectedAt} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status, @Param("rejectedAt") String rejectedAt, @Param("rejectReason") String rejectReason);

    @Update("""
            UPDATE sales_order SET variety = #{variety}, specification = #{specification},
            quantity = #{quantity}, total_amount = #{totalAmount} WHERE id = #{id}
            """)
    int updateDraftFields(@Param("id") Long id, @Param("variety") String variety,
                          @Param("specification") String specification, @Param("quantity") Integer quantity,
                          @Param("totalAmount") BigDecimal totalAmount);

    @Update("UPDATE sales_order SET tracking_no = #{trackingNo}, tracking_com = #{trackingCom}, media = #{media} WHERE id = #{id}")
    int updateTracking(@Param("id") Long id, @Param("trackingNo") String trackingNo, @Param("trackingCom") String trackingCom, @Param("media") String media);

    @Update("""
            UPDATE sales_order SET status = #{status}, cost_amount = #{costAmount}, profit_amount = #{profitAmount},
            satisfaction = #{satisfaction} WHERE id = #{id}
            """)
    int updateSettled(@Param("id") Long id, @Param("status") String status,
                      @Param("costAmount") BigDecimal costAmount, @Param("profitAmount") BigDecimal profitAmount,
                      @Param("satisfaction") int satisfaction);

    @Update("UPDATE sales_order SET status = #{status} WHERE id = #{id}")
    int updateStatusOnly(@Param("id") Long id, @Param("status") String status);

    @Select("<script>SELECT " + ORDER_SELECT + " " + ORDER_FROM
            + " WHERE o.status IN <foreach collection='statuses' item='s' open='(' separator=',' close=')'>#{s}</foreach>"
            + " ORDER BY o.created_at DESC, o.id DESC</script>")
    List<Map<String, Object>> listPending(@Param("statuses") List<String> statuses);

    @Select("""
            SELECT c.region AS city, COUNT(o.id) AS orderCount, COALESCE(SUM(o.total_amount), 0) AS totalAmount
            FROM customer c LEFT JOIN sales_order o ON o.customer_id = c.id
            WHERE c.region IS NOT NULL AND c.region != ''
            GROUP BY c.region ORDER BY totalAmount DESC, c.region ASC
            """)
    List<Map<String, Object>> ordersByCity();

    @Select("""
            SELECT c.district, COUNT(o.id) AS orderCount, COALESCE(SUM(o.total_amount), 0) AS totalAmount
            FROM customer c LEFT JOIN sales_order o ON o.customer_id = c.id
            WHERE c.region = #{city} AND c.district IS NOT NULL AND c.district != ''
            GROUP BY c.district ORDER BY totalAmount DESC, c.district ASC
            """)
    List<Map<String, Object>> ordersByDistrict(String city);

    @Select("""
            SELECT COUNT(o.id) AS orderCount, COALESCE(SUM(o.total_amount), 0) AS total,
            COUNT(DISTINCT c.id) AS customerCount, COUNT(DISTINCT c.region) AS regionCount,
            SUM(CASE WHEN o.status = 'DONE' THEN 1 ELSE 0 END) AS doneCount
            FROM customer c LEFT JOIN sales_order o ON o.customer_id = c.id
            WHERE c.region IS NOT NULL AND c.region != ''
            """)
    Map<String, Object> summaryProvince();

    @Select("""
            SELECT COUNT(o.id) AS orderCount, COALESCE(SUM(o.total_amount), 0) AS total,
            COUNT(DISTINCT c.id) AS customerCount, COUNT(DISTINCT c.district) AS regionCount,
            SUM(CASE WHEN o.status = 'DONE' THEN 1 ELSE 0 END) AS doneCount
            FROM customer c LEFT JOIN sales_order o ON o.customer_id = c.id WHERE c.region = #{city}
            """)
    Map<String, Object> summaryByCity(String city);

    @Select("""
            SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS ym, COUNT(o.id) AS orderCount,
            COALESCE(SUM(o.total_amount), 0) AS totalAmount
            FROM sales_order o JOIN customer c ON c.id = o.customer_id
            WHERE c.region != '' AND DATE_FORMAT(o.created_at, '%Y-%m') IN (#{m1}, #{m2}, #{m3})
            GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
            """)
    List<Map<String, Object>> ordersByMonthProvince(@Param("m1") String m1, @Param("m2") String m2, @Param("m3") String m3);

    @Select("""
            SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS ym, COUNT(o.id) AS orderCount,
            COALESCE(SUM(o.total_amount), 0) AS totalAmount
            FROM sales_order o JOIN customer c ON c.id = o.customer_id
            WHERE c.region = #{city} AND DATE_FORMAT(o.created_at, '%Y-%m') IN (#{m1}, #{m2}, #{m3})
            GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
            """)
    List<Map<String, Object>> ordersByMonthCity(@Param("city") String city, @Param("m1") String m1,
                                                  @Param("m2") String m2, @Param("m3") String m3);

    @Update("""
            UPDATE sales_order SET order_no = #{orderNo}, tracking_no = #{trackingNo}, tracking_com = #{trackingCom},
            variety = #{variety}, specification = #{specification}, quantity = #{quantity}, status = #{status},
            total_amount = #{totalAmount}, satisfaction = #{satisfaction, jdbcType=TINYINT}, created_at = #{createdAt} WHERE id = #{id}
            """)
    int updateFull(@Param("id") Long id, @Param("orderNo") String orderNo, @Param("trackingNo") String trackingNo,
                   @Param("trackingCom") String trackingCom, @Param("variety") String variety,
                   @Param("specification") String specification, @Param("quantity") Integer quantity,
                   @Param("status") String status, @Param("totalAmount") BigDecimal totalAmount,
                   @Param("satisfaction") int satisfaction, @Param("createdAt") String createdAt);

    @Update("""
            UPDATE sales_order SET order_no = #{orderNo}, tracking_no = #{trackingNo}, tracking_com = #{trackingCom},
            variety = #{variety}, specification = #{specification}, quantity = #{quantity}, status = #{status},
            total_amount = #{totalAmount}, satisfaction = NULL, created_at = #{createdAt} WHERE id = #{id}
            """)
    int updateFullNullableSat(@Param("id") Long id, @Param("orderNo") String orderNo, @Param("trackingNo") String trackingNo,
                              @Param("trackingCom") String trackingCom, @Param("variety") String variety,
                              @Param("specification") String specification, @Param("quantity") Integer quantity,
                              @Param("status") String status, @Param("totalAmount") BigDecimal totalAmount,
                              @Param("createdAt") String createdAt);

    @Select("""
            SELECT c.region AS city, COALESCE(SUM(o.total_amount), 0) AS total
            FROM sales_order o INNER JOIN customer c ON c.id = o.customer_id
            GROUP BY c.region ORDER BY total DESC
            """)
    List<Map<String, Object>> financeSalesByCity();

    @Select("SELECT COALESCE(SUM(total_amount), 0) FROM sales_order")
    java.math.BigDecimal sumTotalAmount();

    @Select("SELECT COALESCE(SUM(total_amount), 0) FROM sales_order WHERE status = 'DONE'")
    java.math.BigDecimal sumDoneAmount();
}
