package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.StudentSkillScore;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.SkillType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentSkillScoreRepository extends JpaRepository<StudentSkillScore, Long> {

    // Lấy điểm 1 kỹ năng cụ thể của học viên
    Optional<StudentSkillScore> findByStudentAndSkillType(User student, SkillType skillType);

    // Lấy tất cả điểm kỹ năng của học viên
    List<StudentSkillScore> findByStudent(User student);

    // Lấy học viên có điểm kỹ năng cao nhất
    @Query("SELECT ss FROM StudentSkillScore ss WHERE ss.skillType = :skill ORDER BY ss.currentScore DESC LIMIT :top")
    List<StudentSkillScore> findTopBySkill(@Param("skill") SkillType skill, @Param("top") int top);

    // Lấy học viên đang IMPROVING ở kỹ năng nào đó
    List<StudentSkillScore> findBySkillTypeAndTrend(SkillType skillType, String trend);

    // Kiểm tra học viên đã đạt target chưa
    @Query("SELECT ss FROM StudentSkillScore ss WHERE ss.student = :student AND ss.currentScore >= ss.targetScore AND ss.targetScore IS NOT NULL")
    List<StudentSkillScore> findAchievedTargets(@Param("student") User student);
}
