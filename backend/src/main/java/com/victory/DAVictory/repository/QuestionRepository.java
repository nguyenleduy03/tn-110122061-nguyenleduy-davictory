package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByQuestionGroupIdOrderByOrderIndexAsc(Long groupId);

    List<Question> findByQuestionGroupIdAndIsActiveTrueOrderByOrderIndexAsc(Long groupId);

    Optional<Question> findByQuestionGroupIdAndQuestionNumber(Long groupId, Integer questionNumber);

    List<Question> findByQuestionTypeIdAndIsActiveTrue(Long questionTypeId);

    @Query("SELECT q FROM Question q JOIN q.questionGroup qg JOIN qg.part p JOIN p.session s " +
           "WHERE s.id = :sessionId AND q.isActive = true ORDER BY q.questionNumber ASC")
    List<Question> findAllBySessionId(@Param("sessionId") Long sessionId);

    long countByQuestionGroupId(Long groupId);

    @Transactional
    @Modifying
    @Query("DELETE FROM Question q WHERE q.questionGroup.id = :groupId")
    int deleteByQuestionGroupId(@Param("groupId") Long groupId);
}
