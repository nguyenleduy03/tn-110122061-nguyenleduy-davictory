package com.victory.aiwriting.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/ai/evaluation")
@RequiredArgsConstructor
public class AIEvaluationController {

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/accuracy")
    public ResponseEntity<?> getAccuracyMetrics() {
        var rows = em.createNativeQuery("""
            SELECT agr.overall_band as ai_band,
                   sws.overall_band_score as teacher_band
            FROM ai_grading_results agr
            JOIN student_writing_submissions sws ON sws.id = agr.submission_id
            WHERE agr.status = 'APPROVED'
              AND sws.overall_band_score IS NOT NULL
              AND agr.overall_band IS NOT NULL
            """).getResultList();

        if (rows.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "message", "Chưa có dữ liệu. Cần ít nhất 1 bài đã được chấm bởi cả AI và giáo viên.",
                "dataPoints", 0
            ));
        }

        double totalAbsError = 0;
        double totalSqError = 0;
        double sumAi = 0, sumTeacher = 0;
        double sumAiSq = 0, sumTeacherSq = 0;
        double sumProduct = 0;
        int n = rows.size();
        var details = new ArrayList<Map<String, Object>>();

        for (Object row : rows) {
            Object[] cols = (Object[]) row;
            double aiBand = cols[0] != null ? ((Number) cols[0]).doubleValue() : 0;
            double teacherBand = cols[1] != null ? ((Number) cols[1]).doubleValue() : 0;

            double error = aiBand - teacherBand;
            totalAbsError += Math.abs(error);
            totalSqError += error * error;
            sumAi += aiBand;
            sumTeacher += teacherBand;
            sumAiSq += aiBand * aiBand;
            sumTeacherSq += teacherBand * teacherBand;
            sumProduct += aiBand * teacherBand;

            details.add(Map.of(
                "aiBand", aiBand,
                "teacherBand", teacherBand,
                "difference", Math.round(error * 100.0) / 100.0
            ));
        }

        double mae = totalAbsError / n;
        double rmse = Math.sqrt(totalSqError / n);
        double pearsonR = calculatePearson(n, sumAi, sumTeacher, sumAiSq, sumTeacherSq, sumProduct);
        double exactMatch = details.stream()
            .filter(d -> Math.abs((Double) d.get("difference")) < 0.1)
            .count() * 100.0 / n;
        double withinHalfBand = details.stream()
            .filter(d -> Math.abs((Double) d.get("difference")) <= 0.5)
            .count() * 100.0 / n;

        return ResponseEntity.ok(Map.of(
            "dataPoints", n,
            "mae", Math.round(mae * 100.0) / 100.0,
            "rmse", Math.round(rmse * 100.0) / 100.0,
            "pearsonR", Math.round(pearsonR * 100.0) / 100.0,
            "exactMatchPercent", Math.round(exactMatch * 10.0) / 10.0,
            "withinHalfBandPercent", Math.round(withinHalfBand * 10.0) / 10.0,
            "details", details
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        long totalGraded = ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM ai_grading_results").getSingleResult()).longValue();
        long approved = ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM ai_grading_results WHERE status = 'APPROVED'").getSingleResult()).longValue();
        long rejected = ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM ai_grading_results WHERE status = 'REJECTED'").getSingleResult()).longValue();
        long failed = ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM ai_grading_results WHERE status = 'FAILED'").getSingleResult()).longValue();

        var providerStats = em.createNativeQuery(
            "SELECT provider, COUNT(*) FROM ai_grading_results GROUP BY provider")
            .getResultList();

        var providerMap = new HashMap<String, Long>();
        for (Object row : providerStats) {
            Object[] cols = (Object[]) row;
            providerMap.put((String) cols[0], ((Number) cols[1]).longValue());
        }

        return ResponseEntity.ok(Map.of(
            "totalGraded", totalGraded,
            "approved", approved,
            "rejected", rejected,
            "failed", failed,
            "approvalRate", totalGraded > 0
                ? Math.round(approved * 10000.0 / totalGraded) / 100.0 : 0,
            "byProvider", providerMap
        ));
    }

    private double calculatePearson(int n, double sumX, double sumY,
                                     double sumX2, double sumY2, double sumXY) {
        double numerator = n * sumXY - sumX * sumY;
        double denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denom == 0 ? 0 : numerator / denom;
    }
}
