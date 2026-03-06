package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.entity.TestStatistic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestStatisticRepository extends JpaRepository<TestStatistic, Long> {

    // Lấy thống kê theo đề thi
    Optional<TestStatistic> findByTest(Test test);

    Optional<TestStatistic> findByTestId(Long testId);

    // Đề thi được làm nhiều nhất
    @Query("SELECT ts FROM TestStatistic ts ORDER BY ts.totalAttempts DESC LIMIT :top")
    List<TestStatistic> findMostAttempted(@Param("top") int top);

    // Đề thi có band trung bình cao nhất
    @Query("SELECT ts FROM TestStatistic ts WHERE ts.completedAttempts >= :minCompleted ORDER BY ts.avgBandScore DESC LIMIT :top")
    List<TestStatistic> findHighestAvgBand(@Param("minCompleted") int minCompleted, @Param("top") int top);

    // Đề thi có tỷ lệ hoàn thành thấp (cần xem lại độ khó)
    @Query("SELECT ts FROM TestStatistic ts WHERE ts.totalAttempts >= :minAttempts AND ts.completionRate < :threshold ORDER BY ts.completionRate ASC")
    List<TestStatistic> findLowCompletionRate(@Param("minAttempts") int minAttempts, @Param("threshold") double threshold);

    // Tổng lượt thi toàn hệ thống
    @Query("SELECT COALESCE(SUM(ts.totalAttempts), 0) FROM TestStatistic ts")
    Long sumTotalAttempts();
}
