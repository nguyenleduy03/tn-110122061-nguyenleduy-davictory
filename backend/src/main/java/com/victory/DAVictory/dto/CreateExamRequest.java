package com.victory.DAVictory.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateExamRequest {
    private String title;
    private String description;
    private Long testId;
    private String examType; // CLASS_EXAM, OPEN_EXAM
    private Long classId;
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledEndTime;
    private String password;
    private Integer durationMinutes;
    private Integer maxAttempts = 1;
    private Boolean allowReviewAfterSubmit = false;
    private Integer lateEntryMinutes = 15;
}
