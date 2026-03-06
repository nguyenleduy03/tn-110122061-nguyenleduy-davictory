package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {

    List<QuestionOption> findByQuestionIdOrderByOrderIndexAsc(Long questionId);

    List<QuestionOption> findByQuestionIdAndIsCorrectTrue(Long questionId);
}
