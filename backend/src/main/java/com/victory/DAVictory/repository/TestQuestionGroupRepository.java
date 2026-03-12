package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestQuestionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestQuestionGroupRepository extends JpaRepository<TestQuestionGroup, Long> {

    List<TestQuestionGroup> findByTestPartId(Long testPartId);

    List<TestQuestionGroup> findByTestPartIdOrderByOrderIndexAsc(Long testPartId);

    List<TestQuestionGroup> findByQuestionGroupId(Long questionGroupId);

    boolean existsByTestPartIdAndQuestionGroupId(Long testPartId, Long questionGroupId);

    @Query("SELECT tqg.questionGroup.id FROM TestQuestionGroup tqg " +
           "WHERE tqg.testPart.testSession.test.id = :testId")
    List<Long> findQuestionGroupIdsByTestId(@Param("testId") Long testId);
}
