package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionHintRepository extends JpaRepository<QuestionHint, Long> {

    List<QuestionHint> findByQuestionIdAndIsActiveTrueOrderByHintOrderAsc(Long questionId);
}
