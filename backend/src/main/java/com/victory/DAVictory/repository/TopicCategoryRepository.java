package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TopicCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicCategoryRepository extends JpaRepository<TopicCategory, Long> {

    // Tất cả chủ đề gốc (root)
    List<TopicCategory> findByParentIsNullAndIsActiveTrueOrderByOrderIndexAsc();

    // Chủ đề con của một chủ đề cha
    List<TopicCategory> findByParentIdAndIsActiveTrueOrderByOrderIndexAsc(Long parentId);

    // Tìm theo level
    List<TopicCategory> findByLevelAndIsActiveTrueOrderByOrderIndexAsc(Integer level);

    Optional<TopicCategory> findByCode(String code);

    boolean existsByCode(String code);

    List<TopicCategory> findByNameContainingIgnoreCaseAndIsActiveTrue(String keyword);
}
