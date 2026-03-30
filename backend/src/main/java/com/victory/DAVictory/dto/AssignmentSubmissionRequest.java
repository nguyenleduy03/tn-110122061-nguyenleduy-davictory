package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class AssignmentSubmissionRequest {
    private Long assignmentId;
    private String submissionText;
    private String attachmentUrl;
    private Long examAttemptId;
}
