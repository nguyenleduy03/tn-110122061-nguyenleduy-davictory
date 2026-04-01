package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.Assignment;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AssignmentResponse {
    private Long id;
    private Long classId;
    private String className;
    private String classCode;
    private Long createdById;
    private String createdByName;
    private String title;
    private String description;
    private String type; // TEST or MANUAL
    private Long testId;
    private String testTitle;
    private Double maxScore;
    private LocalDateTime dueDate;
    private Integer maxAttempts;
    private Boolean allowLateSubmission;
    private String status;
    private Long totalStudents;
    private Long submittedCount;
    private Long gradedCount;
    private Double avgScore;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AssignmentResponse fromEntity(Assignment assignment, long totalStudents, long submittedCount, long gradedCount, Double avgScore) {
        AssignmentResponse response = new AssignmentResponse();
        response.setId(assignment.getId());
        if (assignment.getClazz() != null) {
            response.setClassId(assignment.getClazz().getId());
            response.setClassName(assignment.getClazz().getName());
            response.setClassCode(assignment.getClazz().getCode());
        }
        response.setCreatedById(assignment.getCreatedBy().getId());
        response.setCreatedByName(assignment.getCreatedBy().getFullName());
        response.setTitle(assignment.getTitle());
        response.setDescription(assignment.getDescription());
        response.setType(assignment.getType());
        response.setTestId(assignment.getTestId());
        response.setMaxScore(assignment.getMaxScore());
        response.setDueDate(assignment.getDueDate());
        response.setMaxAttempts(assignment.getMaxAttempts());
        response.setAllowLateSubmission(assignment.getAllowLateSubmission());
        response.setStatus(assignment.getStatus());
        response.setTotalStudents(totalStudents);
        response.setSubmittedCount(submittedCount);
        response.setGradedCount(gradedCount);
        response.setAvgScore(avgScore);
        response.setCreatedAt(assignment.getCreatedAt());
        response.setUpdatedAt(assignment.getUpdatedAt());
        return response;
    }
}
