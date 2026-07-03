package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.ExamAttempt;
import com.victory.DAVictory.repository.*;
import com.victory.DAVictory.enums.SkillType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final UserRepository userRepo;
    private final ExamAttemptRepository examAttemptRepo;
    private final TestRepository testRepo;
    private final QuestionRepository questionRepo;
    private final ClassRepository classRepo;

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAll(@RequestParam(defaultValue = "7") int days) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", safe(() -> getSummaryData()));
        result.put("userDistribution", safe(() -> getUserDistributionData()));
        result.put("dashStats", safe(() -> getDashStatsData()));
        result.put("timeSeries", safe(() -> getTimeSeriesData(days)));
        result.put("scoreDistribution", safe(() -> getScoreDistributionData()));
        result.put("skillAverages", safe(() -> getSkillAveragesData()));
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> getSummaryData() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfWeek = today.minusDays(6).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", userRepo.countByDeletedAtIsNull());
        stats.put("totalTeachers", userRepo.countActiveByRoleName("TEACHER"));
        stats.put("totalStudents", userRepo.countActiveByRoleName("STUDENT"));
        stats.put("totalManagers", userRepo.countActiveByRoleName("MANAGER"));
        stats.put("registrationsToday", userRepo.countByDeletedAtIsNullAndCreatedAtBetween(startOfDay, now));
        stats.put("registrationsWeek", userRepo.countByDeletedAtIsNullAndCreatedAtBetween(startOfWeek, now));
        stats.put("loginsToday", userRepo.countByDeletedAtIsNullAndLastLoginBetween(startOfDay, now));
        stats.put("loginsWeek", userRepo.countByDeletedAtIsNullAndLastLoginBetween(startOfWeek, now));
        return stats;
    }

    private List<Map<String, Object>> getUserDistributionData() {
        List<Map<String, Object>> distribution = new ArrayList<>();
        distribution.add(Map.of("name", "Quản trị viên", "value", userRepo.countActiveByRoleName("ADMIN")));
        distribution.add(Map.of("name", "Quản lý", "value", userRepo.countActiveByRoleName("MANAGER")));
        distribution.add(Map.of("name", "Giáo viên", "value", userRepo.countActiveByRoleName("TEACHER")));
        distribution.add(Map.of("name", "Học viên", "value", userRepo.countActiveByRoleName("STUDENT")));
        return distribution;
    }

    private Map<String, Object> getDashStatsData() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalTests", testRepo.count());
        stats.put("totalQuestions", questionRepo.count());
        stats.put("totalAttempts", examAttemptRepo.count());
        stats.put("totalClasses", classRepo.count());

        List<ExamAttempt> allAttempts = safe(() -> examAttemptRepo.findAll(), Collections.<ExamAttempt>emptyList());

        stats.put("avgListening", safe(() -> allAttempts.stream()
                .filter(a -> a.getSession() != null && a.getSession().getSkillType() == SkillType.LISTENING && a.getBandScore() != null)
                .mapToDouble(ExamAttempt::getBandScore).average().orElse(0.0), 0.0));
        stats.put("avgReading", safe(() -> allAttempts.stream()
                .filter(a -> a.getSession() != null && a.getSession().getSkillType() == SkillType.READING && a.getBandScore() != null)
                .mapToDouble(ExamAttempt::getBandScore).average().orElse(0.0), 0.0));
        stats.put("avgWriting", safe(() -> allAttempts.stream()
                .filter(a -> a.getSession() != null && a.getSession().getSkillType() == SkillType.WRITING && a.getBandScore() != null)
                .mapToDouble(ExamAttempt::getBandScore).average().orElse(0.0), 0.0));
        stats.put("avgSpeaking", safe(() -> allAttempts.stream()
                .filter(a -> a.getSession() != null && a.getSession().getSkillType() == SkillType.SPEAKING && a.getBandScore() != null)
                .mapToDouble(ExamAttempt::getBandScore).average().orElse(0.0), 0.0));

        long completed = allAttempts.stream()
                .filter(a -> "SUBMITTED".equals(a.getStatus()) || "GRADED".equals(a.getStatus()) || "TIMED_OUT".equals(a.getStatus()))
                .count();
        long inProgress = allAttempts.stream()
                .filter(a -> "IN_PROGRESS".equals(a.getStatus()))
                .count();
        stats.put("completedAttempts", completed);
        stats.put("inProgressAttempts", inProgress);
        stats.put("otherAttempts", allAttempts.size() - completed - inProgress);

        return stats;
    }

    private Map<String, Object> getTimeSeriesData(int days) {
        LocalDateTime from = LocalDate.now().minusDays(days).atStartOfDay();
        LocalDateTime to = LocalDate.now().plusDays(1).atStartOfDay();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("registrations", aggregateByDate(
                safe(() -> userRepo.countRegistrationsByDate(from, to), Collections.<Object[]>emptyList())));
        result.put("logins", aggregateByDate(
                safe(() -> userRepo.countLoginsByDate(from, to), Collections.<Object[]>emptyList())));
        result.put("attempts", aggregateByDate(
                safe(() -> examAttemptRepo.countAttemptsByDate(from, to), Collections.<Object[]>emptyList())));
        return result;
    }

    private List<Map<String, Object>> getScoreDistributionData() {
        List<ExamAttempt> allAttempts = safe(() -> examAttemptRepo.findAll(), Collections.<ExamAttempt>emptyList());
        Map<Integer, Long> dist = allAttempts.stream()
                .filter(a -> a.getBandScore() != null)
                .collect(Collectors.groupingBy(
                        a -> (int) Math.floor(a.getBandScore()),
                        TreeMap::new,
                        Collectors.counting()));
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i <= 9; i++) {
            result.add(Map.of("band", String.valueOf(i), "count", dist.getOrDefault(i, 0L)));
        }
        return result;
    }

    private Map<String, Object> getSkillAveragesData() {
        List<ExamAttempt> allAttempts = safe(() -> examAttemptRepo.findAll(), Collections.<ExamAttempt>emptyList());
        Map<String, Object> avgs = new LinkedHashMap<>();
        for (SkillType skill : SkillType.values()) {
            double avg = allAttempts.stream()
                    .filter(a -> a.getSession() != null && a.getSession().getSkillType() == skill && a.getBandScore() != null)
                    .mapToDouble(ExamAttempt::getBandScore)
                    .average()
                    .orElse(0.0);
            avgs.put(skill.name().toLowerCase(), Math.round(avg * 10.0) / 10.0);
        }
        return avgs;
    }

    private <T> T safe(Supplier<T> supplier) {
        try { return supplier.get(); } catch (Exception e) { return null; }
    }

    private <T> T safe(Supplier<T> supplier, T fallback) {
        try { return supplier.get(); } catch (Exception e) { return fallback; }
    }

    private List<Map<String, Object>> aggregateByDate(List<Object[]> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            if (row[0] instanceof java.sql.Date d) {
                item.put("date", d.toLocalDate().format(fmt));
            } else if (row[0] instanceof LocalDateTime ldt) {
                item.put("date", ldt.format(fmt));
            } else if (row[0] instanceof LocalDate ld) {
                item.put("date", ld.format(fmt));
            }
            item.put("count", row[1]);
            result.add(item);
        }
        return result;
    }

    // Keep existing endpoints for backward compatibility
    @GetMapping("/time-series")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getTimeSeries(@RequestParam(defaultValue = "30") int days) {
        try { return ResponseEntity.ok(getTimeSeriesData(days));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSummary() {
        try { return ResponseEntity.ok(getSummaryData());
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @GetMapping("/user-distribution")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserDistribution() {
        try { return ResponseEntity.ok(getUserDistributionData());
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @GetMapping("/score-distribution")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getScoreDistribution() {
        try { return ResponseEntity.ok(getScoreDistributionData());
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }
}
