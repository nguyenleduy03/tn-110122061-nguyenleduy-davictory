package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {

    List<QuestionOption> findByQuestionIdOrderByOrderIndexAsc(Long questionId);

    @Transactional
    @Modifying
    @Query("DELETE FROM QuestionOption qo WHERE qo.question.questionGroup.id = :groupId")
    void deleteByQuestionGroupId(@Param("groupId") Long groupId);

    List<QuestionOption> findByQuestionIdAndIsCorrectTrue(Long questionId);
}
