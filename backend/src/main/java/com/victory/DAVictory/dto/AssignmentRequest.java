package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AssignmentRequest {
    private Long classId;
    private String title;
    private String description;
    private String assignmentType;
    private Long testId;
    private String attachmentUrl;
    private LocalDateTime dueDate;
    private Boolean isRequired;
    private Double maxScore;
    private String status;
    private String notes;
}
