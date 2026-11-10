package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.Map;

@Mapper
public interface AiAuditMapper {

    @Insert("""
            INSERT INTO ai_audit (user_id, conversation_id, tool_name, action, summary, before_json, after_json, reversible)
            VALUES (#{userId}, #{conversationId}, #{toolName}, #{action}, #{summary}, #{beforeJson}, #{afterJson}, #{reversible})
            """)
    int insert(@Param("userId") long userId, @Param("conversationId") Long conversationId,
               @Param("toolName") String toolName, @Param("action") String action, @Param("summary") String summary,
               @Param("beforeJson") String beforeJson, @Param("afterJson") String afterJson,
               @Param("reversible") int reversible);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Select("""
            SELECT id, user_id AS userId, conversation_id AS conversationId, tool_name AS toolName, action,
                   summary, before_json AS beforeJson, after_json AS afterJson, reversible, undone_at AS undoneAt,
                   created_at AS createdAt
            FROM ai_audit
            WHERE user_id = #{userId} AND undone_at IS NULL
            ORDER BY id DESC LIMIT 1
            """)
    Map<String, Object> findLatestOpen(long userId);

    @Select("""
            SELECT id, user_id AS userId, conversation_id AS conversationId, tool_name AS toolName, action,
                   summary, before_json AS beforeJson, after_json AS afterJson, reversible, undone_at AS undoneAt,
                   created_at AS createdAt
            FROM ai_audit
            WHERE id = #{id} AND user_id = #{userId}
            """)
    Map<String, Object> findOwned(@Param("id") long id, @Param("userId") long userId);

    @Update("UPDATE ai_audit SET undone_at = CURRENT_TIMESTAMP WHERE id = #{id} AND user_id = #{userId} AND undone_at IS NULL")
    int markUndone(@Param("id") long id, @Param("userId") long userId);
}
