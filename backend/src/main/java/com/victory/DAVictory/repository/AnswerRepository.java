package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {

    List<Answer> findByQuestionIdOrderByBlankIndexAsc(Long questionId);

    @Transactional
    @Modifying
    @Query("DELETE FROM Answer a WHERE a.question.questionGroup.id = :groupId")
    void deleteByQuestionGroupId(@Param("groupId") Long groupId);

    Optional<Answer> findByQuestionIdAndBlankIndex(Long questionId, Integer blankIndex);
}
