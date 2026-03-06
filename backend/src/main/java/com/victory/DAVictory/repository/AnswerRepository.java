package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {

    List<Answer> findByQuestionIdOrderByBlankIndexAsc(Long questionId);

    Optional<Answer> findByQuestionIdAndBlankIndex(Long questionId, Integer blankIndex);
}
