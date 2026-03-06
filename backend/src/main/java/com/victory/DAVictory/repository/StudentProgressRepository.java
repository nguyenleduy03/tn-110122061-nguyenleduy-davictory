package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.StudentProgress;
import com.victory.DAVictory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProgressRepository extends JpaRepository<StudentProgress, Long> {

    // Lấy tiến độ 1 ngày cụ thể của học viên
    Optional<StudentProgress> findByStudentAndTrackedDate(User student, LocalDate trackedDate);

    // Lấy toàn bộ lịch sử tiến độ của học viên (mới nhất trước)
    List<StudentProgress> findByStudentOrderByTrackedDateDesc(User student);

    // Lấy tiến độ trong khoảng thời gian
    List<StudentProgress> findByStudentAndTrackedDateBetweenOrderByTrackedDateAsc(
            User student, LocalDate from, LocalDate to);

    // Lấy N ngày gần nhất
    @Query("SELECT sp FROM StudentProgress sp WHERE sp.student = :student ORDER BY sp.trackedDate DESC LIMIT :days")
    List<StudentProgress> findRecentDays(@Param("student") User student, @Param("days") int days);

    // Tổng thời gian học của học viên
    @Query("SELECT COALESCE(SUM(sp.studyMinutes), 0) FROM StudentProgress sp WHERE sp.student = :student")
    Integer sumStudyMinutes(@Param("student") User student);

    // Streak hiện tại lớn nhất
    @Query("SELECT MAX(sp.longestStreak) FROM StudentProgress sp WHERE sp.student = :student")
    Integer findMaxStreak(@Param("student") User student);
}
