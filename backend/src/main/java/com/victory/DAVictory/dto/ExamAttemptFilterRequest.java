package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ExamAttemptFilterRequest {
    private Long classId;
    private Long studentId;
    private Long testId;
    private SkillType skillType;
    private String status; // IN_PROGRESS, SUBMITTED, GRADED, TIMED_OUT
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Double minBandScore;
    private Double maxBandScore;
    private Integer page = 0;
    private Integer size = 20;
    private String sortBy = "submittedAt"; // submittedAt, bandScore, createdAt
    private String sortDirection = "DESC"; // ASC, DESC
}
