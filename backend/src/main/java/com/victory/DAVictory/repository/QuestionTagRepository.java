package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionTagRepository extends JpaRepository<QuestionTag, Long> {

    List<QuestionTag> findByQuestionId(Long questionId);

    List<QuestionTag> findByTagName(String tagName);

    boolean existsByQuestionIdAndTagName(Long questionId, String tagName);

    void deleteByQuestionIdAndTagName(Long questionId, String tagName);

    @Query("SELECT DISTINCT qt.tagName FROM QuestionTag qt ORDER BY qt.tagName ASC")
    List<String> findAllDistinctTagNames();
}
