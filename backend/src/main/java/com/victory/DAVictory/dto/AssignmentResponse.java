package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.Assignment;
import lombok.Data;
import java.time.LocalDateTime;

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
    private String assignmentType;
    private Long testId;
    private String testTitle;
    private String attachmentUrl;
    private LocalDateTime assignedAt;
    private LocalDateTime dueDate;
    private Boolean isRequired;
    private Double maxScore;
    private String status;
    private String notes;
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
        response.setAssignmentType(assignment.getAssignmentType());
        response.setTestId(assignment.getTestId());
        response.setAttachmentUrl(assignment.getAttachmentUrl());
        response.setAssignedAt(assignment.getAssignedAt());
        response.setDueDate(assignment.getDueDate());
        response.setIsRequired(assignment.getIsRequired());
        response.setMaxScore(assignment.getMaxScore());
        response.setStatus(assignment.getStatus());
        response.setNotes(assignment.getNotes());
        response.setTotalStudents(totalStudents);
        response.setSubmittedCount(submittedCount);
        response.setGradedCount(gradedCount);
        response.setAvgScore(avgScore);
        response.setCreatedAt(assignment.getCreatedAt());
        response.setUpdatedAt(assignment.getUpdatedAt());
        return response;
    }
}
