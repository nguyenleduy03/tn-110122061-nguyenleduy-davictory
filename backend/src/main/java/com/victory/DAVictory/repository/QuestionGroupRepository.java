package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionGroupRepository extends JpaRepository<QuestionGroup, Long> {

    List<QuestionGroup> findByPartIdOrderByOrderIndexAsc(Long partId);

    List<QuestionGroup> findByPartIdAndIsActiveTrueOrderByOrderIndexAsc(Long partId);

    boolean existsByPartIdAndTitle(Long partId, String title);

    @Query(value = """
        SELECT DISTINCT 
            qg.id as groupId,
            qg.created_at as createdAt,
            'N/A' as createdBy,
            COUNT(q.id) as questionCount
        FROM test_question_groups tqg
        JOIN question_groups qg ON tqg.question_group_id = qg.id
        LEFT JOIN questions q ON qg.id = q.question_group_id
        WHERE tqg.test_part_id IN (
            SELECT tp.id FROM test_parts tp
            JOIN test_sessions ts ON tp.test_session_id = ts.id
            WHERE ts.test_id = :testId
        )
        GROUP BY qg.id, qg.created_at
        ORDER BY qg.created_at DESC
    """, nativeQuery = true)
    List<Object[]> findVersionHistoryByTestId(@Param("testId") Long testId);
}
