package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.TestSession;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TestSessionResponse {
    private Long id;
    private Long testId;
    private Long sessionId;
    private String sessionName;
    private String skillType;      // LISTENING, READING, WRITING, SPEAKING
    private String testType;       // ACADEMIC, GENERAL
    private Integer orderIndex;
    private Boolean isIncluded;
    private Integer durationMinutes;       // Thời gian hiệu lực (override hoặc mặc định)
    private Integer defaultDurationMinutes; // Thời gian gốc của session master
    private String instructions;
    private Integer totalQuestions;
    private Double maxScore;
    private Integer partCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TestSessionResponse fromEntity(TestSession ts) {
        TestSessionResponse dto = new TestSessionResponse();
        dto.setId(ts.getId());
        dto.setTestId(ts.getTest().getId());
        dto.setSessionId(ts.getSession().getId());
        dto.setSessionName(ts.getSession().getName());
        dto.setSkillType(ts.getSession().getSkillType().name());
        dto.setTestType(ts.getSession().getTestType().name());
        dto.setOrderIndex(ts.getOrderIndex());
        dto.setIsIncluded(ts.getIsIncluded());
        dto.setDefaultDurationMinutes(ts.getSession().getDurationMinutes());
        // Ưu tiên override, nếu null thì dùng mặc định
        dto.setDurationMinutes(ts.getDurationMinutes() != null
                ? ts.getDurationMinutes()
                : ts.getSession().getDurationMinutes());
        dto.setInstructions(ts.getInstructions() != null
                ? ts.getInstructions()
                : ts.getSession().getInstructions());
        dto.setTotalQuestions(ts.getSession().getTotalQuestions());
        dto.setMaxScore(ts.getSession().getMaxScore());
        dto.setPartCount(ts.getTestParts() != null ? ts.getTestParts().size() : 0);
        dto.setCreatedAt(ts.getCreatedAt());
        dto.setUpdatedAt(ts.getUpdatedAt());
        return dto;
    }
}
