package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.AssignmentSubmission;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AssignmentSubmissionResponse {
    private Long id;
    private Long assignmentId;
    private String assignmentTitle;
    private Long studentId;
    private String studentName;
    private Integer attemptNumber;
    private String submissionText;
    private String attachmentUrl;
    private Long examAttemptId;
    private LocalDateTime submittedAt;
    private String status;
    private Double score;
    private String feedback;
    private String gradedBy;
    private LocalDateTime gradedAt;

    // Legacy fields for backward compatibility
    private Long userId;
    private String username;
    private String fullName;
    private Long gradedById;
    private String gradedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AssignmentSubmissionResponse fromEntity(AssignmentSubmission submission) {
        AssignmentSubmissionResponse response = new AssignmentSubmissionResponse();
        response.setId(submission.getId());
        response.setAssignmentId(submission.getAssignment().getId());
        response.setAssignmentTitle(submission.getAssignment().getTitle());
        response.setStudentId(submission.getUser().getId());
        response.setStudentName(submission.getUser().getFullName());
        response.setAttemptNumber(submission.getAttemptNumber());
        response.setSubmissionText(submission.getSubmissionText());
        response.setAttachmentUrl(submission.getAttachmentUrl());
        response.setExamAttemptId(submission.getExamAttemptId());
        response.setSubmittedAt(submission.getSubmittedAt());
        response.setStatus(submission.getStatus());
        response.setScore(submission.getScore());
        response.setFeedback(submission.getFeedback());
        if (submission.getGradedBy() != null) {
            response.setGradedBy(submission.getGradedBy().getFullName());
            response.setGradedById(submission.getGradedBy().getId());
            response.setGradedByName(submission.getGradedBy().getFullName());
        }
        response.setGradedAt(submission.getGradedAt());
        
        // Legacy fields
        response.setUserId(submission.getUser().getId());
        response.setUsername(submission.getUser().getUsername());
        response.setFullName(submission.getUser().getFullName());
        response.setCreatedAt(submission.getCreatedAt());
        response.setUpdatedAt(submission.getUpdatedAt());
        return response;
    }
}
