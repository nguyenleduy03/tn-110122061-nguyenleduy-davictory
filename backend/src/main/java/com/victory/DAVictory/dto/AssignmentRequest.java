package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AssignmentRequest {
    private Long classId;
    private String title;
    private String description;
    private String type; // TEST or MANUAL
    private Long testId;
    private Double maxScore;
    private LocalDateTime dueDate;
    private Integer maxAttempts;
    private Boolean allowLateSubmission;
    private String status;
}
