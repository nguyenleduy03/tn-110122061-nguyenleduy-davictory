package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.Test;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class TestResponse {
    private Long id;
    private String title;
    private String description;
    private TestType testType;
    private TestStatus status;
    private Boolean isFullTest;
    private Integer durationMinutes;
    private String targetBand;
    private Integer attemptCount;
    private Double averageScore;

    // Thông tin người tạo
    private Long createdById;
    private String createdByName;

    // Thông tin duyệt
    private Long reviewedById;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Danh sách session trong đề (tóm tắt)
    private List<SessionSummary> sessions;

    @Data
    public static class SessionSummary {
        private Long testSessionId;
        private Long sessionId;
        private String sessionName;
        private String skillType;
        private Integer orderIndex;
        private Boolean isIncluded;
        private Integer durationMinutes;
        private Integer partCount;
    }

    // Factory method: chuyển entity → DTO
    public static TestResponse fromEntity(Test test) {
        TestResponse dto = new TestResponse();
        dto.setId(test.getId());
        dto.setTitle(test.getTitle());
        dto.setDescription(test.getDescription());
        dto.setTestType(test.getTestType());
        dto.setStatus(test.getStatus());
        dto.setIsFullTest(test.getIsFullTest());
        dto.setDurationMinutes(test.getDurationMinutes());
        dto.setTargetBand(test.getTargetBand());
        dto.setAttemptCount(test.getAttemptCount());
        dto.setAverageScore(test.getAverageScore());
        dto.setCreatedAt(test.getCreatedAt());
        dto.setUpdatedAt(test.getUpdatedAt());
        dto.setPublishedAt(test.getPublishedAt());
        dto.setReviewedAt(test.getReviewedAt());

        if (test.getCreatedBy() != null) {
            dto.setCreatedById(test.getCreatedBy().getId());
            dto.setCreatedByName(test.getCreatedBy().getFullName());
        }
        if (test.getReviewedBy() != null) {
            dto.setReviewedById(test.getReviewedBy().getId());
            dto.setReviewedByName(test.getReviewedBy().getFullName());
        }

        // Map sessions
        if (test.getTestSessions() != null) {
            dto.setSessions(test.getTestSessions().stream().map(ts -> {
                SessionSummary s = new SessionSummary();
                s.setTestSessionId(ts.getId());
                s.setSessionId(ts.getSession().getId());
                s.setSessionName(ts.getSession().getName());
                s.setSkillType(ts.getSession().getSkillType().name());
                s.setOrderIndex(ts.getOrderIndex());
                s.setIsIncluded(ts.getIsIncluded());
                s.setDurationMinutes(ts.getDurationMinutes() != null
                        ? ts.getDurationMinutes()
                        : ts.getSession().getDurationMinutes());
                s.setPartCount(ts.getTestParts() != null ? ts.getTestParts().size() : 0);
                return s;
            }).collect(Collectors.toList()));
        }

        return dto;
    }
}
