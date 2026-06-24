package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.ExamStatus;
import com.victory.DAVictory.enums.ExamType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamResponse {
    private Long id;
    private String title;
    private String description;
    private ExamType examType;
    private ExamStatus status;
    private Long testId;
    private String testTitle;
    private Long classId;
    private String className;
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledEndTime;
    private boolean hasPassword;
    private Integer durationMinutes;
    private Integer maxAttempts;
    private Boolean allowReviewAfterSubmit;
    private Integer lateEntryMinutes;
    private String createdByUsername;
    private LocalDateTime startedAt;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private int totalAttempts;
    private int totalSubmitted;
}
