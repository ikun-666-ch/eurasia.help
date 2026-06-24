package com.eurasia.nursery.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface CategoryMapper {

    @Select("SELECT * FROM seedling_category WHERE parent_id IS NULL ORDER BY sort_order")
    List<Map<String, Object>> findRoots();

    @Select("SELECT * FROM seedling_category WHERE parent_id = #{parentId} ORDER BY sort_order")
    List<Map<String, Object>> findByParent(Long parentId);

    @Select("SELECT * FROM seedling_category WHERE id = #{id}")
    Map<String, Object> findById(Long id);

    @Select("SELECT COUNT(*) FROM seedling_category WHERE parent_id = #{id}")
    int countChildren(Long id);

    @Insert("INSERT INTO seedling_category (parent_id, name, level, sort_order) VALUES (#{parentId}, #{name}, #{level}, #{sortOrder})")
    int insert(@Param("parentId") Long parentId, @Param("name") String name, @Param("level") int level, @Param("sortOrder") int sortOrder);

    @Select("SELECT LAST_INSERT_ID()")
    Long lastInsertId();

    @Update("UPDATE seedling_category SET name = #{name} WHERE id = #{id}")
    int updateName(@Param("id") Long id, @Param("name") String name);

    @Update("UPDATE seedling_category SET sort_order = #{sortOrder} WHERE id = #{id}")
    int updateSortOrder(@Param("id") Long id, @Param("sortOrder") int sortOrder);

    @Select("SELECT id FROM seedling_category WHERE id = #{id}")
    Long categoryExists(Long id);

    @Delete("DELETE FROM seedling_category WHERE id = #{id}")
    int delete(Long id);
}
