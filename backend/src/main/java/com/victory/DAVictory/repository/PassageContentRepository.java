package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.PassageContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PassageContentRepository extends JpaRepository<PassageContent, Long> {

    List<PassageContent> findByTopic(String topic);

    List<PassageContent> findByReadingLevel(String readingLevel);

    List<PassageContent> findByIsActive(Boolean isActive);

    List<PassageContent> findByIsVerified(Boolean isVerified);

    List<PassageContent> findByCreatedById(Long userId);

    @Query("SELECT p FROM PassageContent p WHERE p.title LIKE %:keyword% OR p.topic LIKE %:keyword%")
    List<PassageContent> searchByKeyword(@Param("keyword") String keyword);

    @Query("SELECT p FROM PassageContent p WHERE p.wordCount BETWEEN :min AND :max")
    List<PassageContent> findByWordCountBetween(@Param("min") Integer min, @Param("max") Integer max);
}
