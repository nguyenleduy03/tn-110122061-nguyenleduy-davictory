package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Question;
import com.victory.DAVictory.entity.QuestionStatistic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionStatisticRepository extends JpaRepository<QuestionStatistic, Long> {

    // Lấy thống kê theo câu hỏi
    Optional<QuestionStatistic> findByQuestion(Question question);

    Optional<QuestionStatistic> findByQuestionId(Long questionId);

    // Lấy câu hỏi khó nhất (correct rate thấp)
    @Query("SELECT qs FROM QuestionStatistic qs WHERE qs.totalAttempts >= :minAttempts ORDER BY qs.correctRate ASC LIMIT :top")
    List<QuestionStatistic> findHardest(@Param("minAttempts") int minAttempts, @Param("top") int top);

    // Lấy câu hỏi dễ nhất (correct rate cao)
    @Query("SELECT qs FROM QuestionStatistic qs WHERE qs.totalAttempts >= :minAttempts ORDER BY qs.correctRate DESC LIMIT :top")
    List<QuestionStatistic> findEasiest(@Param("minAttempts") int minAttempts, @Param("top") int top);

    // Lấy theo category độ khó
    List<QuestionStatistic> findByDifficultyCategory(String difficultyCategory);

    // Câu hỏi có chỉ số phân biệt thấp (cần rà soát)
    @Query("SELECT qs FROM QuestionStatistic qs WHERE qs.discriminationIndex < :threshold AND qs.totalAttempts >= :minAttempts")
    List<QuestionStatistic> findLowDiscrimination(@Param("threshold") double threshold, @Param("minAttempts") int minAttempts);

    void deleteByQuestionId(Long questionId);
}
