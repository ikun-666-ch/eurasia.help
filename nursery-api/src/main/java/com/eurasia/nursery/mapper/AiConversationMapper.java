package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Map;

@Mapper
public interface AiConversationMapper {

    @Insert("INSERT INTO ai_conversation (user_id, title) VALUES (#{userId}, #{title})")
    int insert(@Param("userId") long userId, @Param("title") String title);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Select("""
            <script>
            SELECT c.id, c.title, c.archived AS archived, c.created_at AS createdAt, c.updated_at AS updatedAt
            FROM ai_conversation c
            WHERE c.user_id = #{userId}
            AND c.archived = #{archived}
            <if test="q != null and q != ''">
            AND (
              c.title LIKE CONCAT('%', #{q}, '%')
              OR EXISTS (
                SELECT 1 FROM ai_message m
                WHERE m.conversation_id = c.id AND m.content LIKE CONCAT('%', #{q}, '%')
              )
            )
            </if>
            ORDER BY c.updated_at DESC, c.id DESC
            </script>
            """)
    List<Map<String, Object>> search(@Param("userId") long userId, @Param("q") String q, @Param("archived") int archived);

    @Select("""
            SELECT id, title, archived AS archived, created_at AS createdAt, updated_at AS updatedAt
            FROM ai_conversation
            WHERE id = #{id} AND user_id = #{userId}
            """)
    Map<String, Object> findOwned(@Param("id") long id, @Param("userId") long userId);

    @Update("""
            UPDATE ai_conversation
            SET archived = #{archived}, updated_at = CURRENT_TIMESTAMP
            WHERE id = #{id} AND user_id = #{userId}
            """)
    int updateArchived(@Param("id") long id, @Param("userId") long userId, @Param("archived") int archived);

    @Update("""
            UPDATE ai_conversation
            SET title = #{title}, updated_at = CURRENT_TIMESTAMP
            WHERE id = #{id} AND user_id = #{userId}
            """)
    int updateTitle(@Param("id") long id, @Param("userId") long userId, @Param("title") String title);

    @Update("""
            UPDATE ai_conversation
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = #{id} AND user_id = #{userId}
            """)
    int touch(@Param("id") long id, @Param("userId") long userId);

    @Delete("DELETE FROM ai_message WHERE conversation_id = #{id}")
    int deleteMessages(long id);

    @Delete("DELETE FROM ai_conversation WHERE id = #{id} AND user_id = #{userId}")
    int deleteOwned(@Param("id") long id, @Param("userId") long userId);

    @Insert("""
            INSERT INTO ai_message (conversation_id, role, content, tool_trace)
            VALUES (#{conversationId}, #{role}, #{content}, #{toolTrace})
            """)
    int insertMessage(@Param("conversationId") long conversationId, @Param("role") String role,
                      @Param("content") String content, @Param("toolTrace") String toolTrace);

    @Select("""
            SELECT id, role, content, tool_trace AS toolTrace, created_at AS createdAt
            FROM ai_message
            WHERE conversation_id = #{conversationId}
            ORDER BY id ASC
            """)
    List<Map<String, Object>> listMessages(long conversationId);
}
