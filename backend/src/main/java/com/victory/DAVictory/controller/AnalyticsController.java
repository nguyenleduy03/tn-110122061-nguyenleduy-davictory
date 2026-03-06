package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import com.victory.DAVictory.enums.SkillType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "API thống kê và phân tích học tập")
public class AnalyticsController {

    private final StudentProgressRepository progressRepository;
    private final StudentSkillScoreRepository skillScoreRepository;
    private final QuestionStatisticRepository questionStatRepository;
    private final TestStatisticRepository testStatRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final TestRepository testRepository;

    // ===== PHÂN TÍCH HỌC VIÊN =====

    @GetMapping("/student-progress/{studentId}")
    @Operation(summary = "Tiến độ học tập của học viên", description = "Lịch sử học tập theo ngày")
    public ResponseEntity<Map<String, Object>> getStudentProgress(
            @PathVariable Long studentId,
            @RequestParam(required = false) Integer days) {
        
        return userRepository.findById(studentId)
            .map(student -> {
                List<StudentProgress> progress;
                if (days != null && days > 0) {
                    progress = progressRepository.findRecentDays(student, days);
                } else {
                    progress = progressRepository.findByStudentOrderByTrackedDateDesc(student);
                }
                
                Integer totalStudyMinutes = progressRepository.sumStudyMinutes(student);
                Integer maxStreak = progressRepository.findMaxStreak(student);
                
                return ResponseEntity.ok(Map.of(
                    "student", student,
                    "progress", progress,
                    "totalStudyMinutes", totalStudyMinutes != null ? totalStudyMinutes : 0,
                    "maxStreak", maxStreak != null ? maxStreak : 0
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/student-progress/{studentId}/range")
    @Operation(summary = "Tiến độ trong khoảng thời gian", description = "Lọc tiến độ từ ngày đến ngày")
    public ResponseEntity<List<StudentProgress>> getStudentProgressRange(
            @PathVariable Long studentId,
            @RequestParam String from,
            @RequestParam String to) {
        
        return userRepository.findById(studentId)
            .map(student -> {
                LocalDate fromDate = LocalDate.parse(from);
                LocalDate toDate = LocalDate.parse(to);
                
                List<StudentProgress> progress = progressRepository
                    .findByStudentAndTrackedDateBetweenOrderByTrackedDateAsc(student, fromDate, toDate);
                
                return ResponseEntity.ok(progress);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/student-skills/{studentId}")
    @Operation(summary = "Điểm từng kỹ năng của học viên", description = "Band score Listening, Reading, Writing, Speaking")
    public ResponseEntity<Map<String, Object>> getStudentSkillScores(@PathVariable Long studentId) {
        return userRepository.findById(studentId)
            .map(student -> {
                List<StudentSkillScore> scores = skillScoreRepository.findByStudent(student);
                
                Map<String, StudentSkillScore> scoreMap = new HashMap<>();
                for (StudentSkillScore score : scores) {
                    scoreMap.put(score.getSkillType().name(), score);
                }
                
                return ResponseEntity.ok(Map.of(
                    "student", student,
                    "skills", scoreMap,
                    "allScores", scores
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/student-skills/{studentId}/skill/{skillType}")
    @Operation(summary = "Điểm 1 kỹ năng cụ thể", description = "Chi tiết điểm Listening/Reading/Writing/Speaking")
    public ResponseEntity<StudentSkillScore> getStudentSkillScore(
            @PathVariable Long studentId,
            @PathVariable String skillType) {

        return userRepository.findById(studentId)
            .map(student -> {
                SkillType skill = SkillType.valueOf(skillType.toUpperCase());
                return skillScoreRepository.findByStudentAndSkillType(student, skill)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.<StudentSkillScore>notFound().build());
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/student-skills/{studentId}/achieved-targets")
    @Operation(summary = "Mục tiêu đã đạt được", description = "Các kỹ năng đã đạt target band")
    public ResponseEntity<List<StudentSkillScore>> getAchievedTargets(@PathVariable Long studentId) {
        return userRepository.findById(studentId)
            .map(student -> ResponseEntity.ok(skillScoreRepository.findAchievedTargets(student)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ===== BẢNG XẾP HẠNG =====

    @GetMapping("/leaderboard/skill/{skillType}")
    @Operation(summary = "Bảng xếp hạng theo kỹ năng", description = "Top học viên có điểm cao nhất")
    public ResponseEntity<List<StudentSkillScore>> getSkillLeaderboard(
            @PathVariable String skillType,
            @RequestParam(defaultValue = "10") Integer top) {
        
        SkillType skill = SkillType.valueOf(skillType.toUpperCase());
        return ResponseEntity.ok(skillScoreRepository.findTopBySkill(skill, top));
    }

    @GetMapping("/students/improving/{skillType}")
    @Operation(summary = "Học viên đang tiến bộ", description = "Danh sách học viên có xu hướng IMPROVING")
    public ResponseEntity<List<StudentSkillScore>> getImprovingStudents(@PathVariable String skillType) {
        SkillType skill = SkillType.valueOf(skillType.toUpperCase());
        return ResponseEntity.ok(skillScoreRepository.findBySkillTypeAndTrend(skill, "IMPROVING"));
    }

    // ===== PHÂN TÍCH CÂU HỎI =====

    @GetMapping("/question-stats/{questionId}")
    @Operation(summary = "Thống kê 1 câu hỏi", description = "Tỷ lệ đúng, thời gian trung bình, độ khó")
    public ResponseEntity<QuestionStatistic> getQuestionStats(@PathVariable Long questionId) {
        return questionStatRepository.findByQuestionId(questionId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/questions/hardest")
    @Operation(summary = "Câu hỏi khó nhất", description = "Top câu hỏi có tỷ lệ đúng thấp nhất")
    public ResponseEntity<List<QuestionStatistic>> getHardestQuestions(
            @RequestParam(defaultValue = "20") Integer minAttempts,
            @RequestParam(defaultValue = "10") Integer top) {
        
        return ResponseEntity.ok(questionStatRepository.findHardest(minAttempts, top));
    }

    @GetMapping("/questions/easiest")
    @Operation(summary = "Câu hỏi dễ nhất", description = "Top câu hỏi có tỷ lệ đúng cao nhất")
    public ResponseEntity<List<QuestionStatistic>> getEasiestQuestions(
            @RequestParam(defaultValue = "20") Integer minAttempts,
            @RequestParam(defaultValue = "10") Integer top) {
        
        return ResponseEntity.ok(questionStatRepository.findEasiest(minAttempts, top));
    }

    @GetMapping("/questions/low-discrimination")
    @Operation(summary = "Câu hỏi cần rà soát", description = "Câu hỏi có chỉ số phân biệt thấp")
    public ResponseEntity<List<QuestionStatistic>> getLowDiscriminationQuestions(
            @RequestParam(defaultValue = "0.2") Double threshold,
            @RequestParam(defaultValue = "20") Integer minAttempts) {
        
        return ResponseEntity.ok(questionStatRepository.findLowDiscrimination(threshold, minAttempts));
    }

    @GetMapping("/questions/difficulty/{category}")
    @Operation(summary = "Câu hỏi theo độ khó", description = "Filter: VERY_EASY, EASY, MEDIUM, HARD, VERY_HARD")
    public ResponseEntity<List<QuestionStatistic>> getQuestionsByDifficulty(@PathVariable String category) {
        return ResponseEntity.ok(questionStatRepository.findByDifficultyCategory(category));
    }

    // ===== PHÂN TÍCH ĐỀ THI =====

    @GetMapping("/test-stats/{testId}")
    @Operation(summary = "Thống kê 1 đề thi", description = "Lượt thi, điểm trung bình, tỷ lệ hoàn thành")
    public ResponseEntity<TestStatistic> getTestStats(@PathVariable Long testId) {
        return testStatRepository.findByTestId(testId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/tests/most-attempted")
    @Operation(summary = "Đề thi được làm nhiều nhất", description = "Top đề thi phổ biến")
    public ResponseEntity<List<TestStatistic>> getMostAttemptedTests(
            @RequestParam(defaultValue = "10") Integer top) {
        
        return ResponseEntity.ok(testStatRepository.findMostAttempted(top));
    }

    @GetMapping("/tests/highest-band")
    @Operation(summary = "Đề thi có band trung bình cao nhất", description = "Top đề thi dễ nhất")
    public ResponseEntity<List<TestStatistic>> getHighestBandTests(
            @RequestParam(defaultValue = "5") Integer minCompleted,
            @RequestParam(defaultValue = "10") Integer top) {
        
        return ResponseEntity.ok(testStatRepository.findHighestAvgBand(minCompleted, top));
    }

    @GetMapping("/tests/low-completion")
    @Operation(summary = "Đề thi có tỷ lệ hoàn thành thấp", description = "Đề thi cần xem lại độ khó")
    public ResponseEntity<List<TestStatistic>> getLowCompletionTests(
            @RequestParam(defaultValue = "10") Integer minAttempts,
            @RequestParam(defaultValue = "0.5") Double threshold) {
        
        return ResponseEntity.ok(testStatRepository.findLowCompletionRate(minAttempts, threshold));
    }

    @GetMapping("/tests/total-attempts")
    @Operation(summary = "Tổng lượt thi toàn hệ thống", description = "Thống kê tổng quan")
    public ResponseEntity<Map<String, Object>> getTotalAttempts() {
        Long totalAttempts = testStatRepository.sumTotalAttempts();
        
        return ResponseEntity.ok(Map.of(
            "totalAttempts", totalAttempts != null ? totalAttempts : 0,
            "totalTests", testRepository.count(),
            "totalQuestions", questionRepository.count()
        ));
    }

    // ===== BÁO CÁO TỔNG HỢP =====

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard tổng quan", description = "Tổng hợp thống kê cho admin/manager")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Long totalAttempts = testStatRepository.sumTotalAttempts();
        
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalStudents", userRepository.count());
        dashboard.put("totalTests", testRepository.count());
        dashboard.put("totalQuestions", questionRepository.count());
        dashboard.put("totalAttempts", totalAttempts != null ? totalAttempts : 0);
        dashboard.put("mostAttemptedTests", testStatRepository.findMostAttempted(5));
        dashboard.put("hardestQuestions", questionStatRepository.findHardest(20, 5));
        
        return ResponseEntity.ok(dashboard);
    }
}
