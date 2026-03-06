package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findByNameAndCategory(String name, String category);

    boolean existsByNameAndCategory(String name, String category);

    List<Tag> findByCategoryAndIsActiveTrueOrderByNameAsc(String category);

    List<Tag> findByIsActiveTrueOrderByUsageCountDesc();

    // Tìm kiếm tag theo từ khóa (dùng cho autocomplete)
    List<Tag> findByNameContainingIgnoreCaseAndIsActiveTrue(String keyword);

    // Top tag được dùng nhiều nhất theo category
    @Query("SELECT t FROM Tag t WHERE t.category = :category AND t.isActive = true " +
           "ORDER BY t.usageCount DESC")
    List<Tag> findTopTagsByCategory(@Param("category") String category);

    // Tất cả category hiện có
    @Query("SELECT DISTINCT t.category FROM Tag t WHERE t.isActive = true ORDER BY t.category ASC")
    List<String> findAllDistinctCategories();
}
