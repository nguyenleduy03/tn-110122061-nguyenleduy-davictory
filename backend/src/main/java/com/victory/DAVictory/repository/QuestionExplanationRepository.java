package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionExplanation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuestionExplanationRepository extends JpaRepository<QuestionExplanation, Long> {

    Optional<QuestionExplanation> findByQuestionId(Long questionId);

    boolean existsByQuestionId(Long questionId);
}
