package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.TestPart;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TestPartResponse {
    private Long id;
    private Long testSessionId;
    private Long partId;
    private String partName;          // "Part 1", "Passage 2", "Task 1", ...
    private String questionFormat;    // "Multiple Choice", "Fill in Blank", ...
    private Integer orderIndex;
    private Boolean isIncluded;
    private Integer questionCount;    // Số câu hỏi thực tế trong đề
    private Integer defaultQuestions; // Số câu gốc của part master
    private Integer durationMinutes;  // Thời gian hiệu lực
    private Integer defaultDuration;  // Thời gian gốc của part
    private Double scoreWeight;
    private String description;
    private String instructions;
    private String difficultyLevel;
    private Integer questionGroupCount; // Số group câu hỏi đã có
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TestPartResponse fromEntity(TestPart tp) {
        TestPartResponse dto = new TestPartResponse();
        dto.setId(tp.getId());
        dto.setTestSessionId(tp.getTestSession().getId());
        dto.setPartId(tp.getPart().getId());
        dto.setPartName(tp.getPart().getName());
        dto.setQuestionFormat(tp.getPart().getQuestionFormat());
        dto.setOrderIndex(tp.getOrderIndex());
        dto.setIsIncluded(tp.getIsIncluded());
        dto.setDefaultQuestions(tp.getPart().getTotalQuestions());
        dto.setQuestionCount(tp.getQuestionCount() != null
                ? tp.getQuestionCount()
                : tp.getPart().getTotalQuestions());
        dto.setDefaultDuration(tp.getPart().getDurationMinutes());
        dto.setDurationMinutes(tp.getDurationMinutes() != null
                ? tp.getDurationMinutes()
                : tp.getPart().getDurationMinutes());
        dto.setScoreWeight(tp.getPart().getScoreWeight());
        dto.setDescription(tp.getPart().getDescription());
        dto.setInstructions(tp.getPart().getInstructions());
        if (tp.getPart().getDifficultyLevel() != null) {
            dto.setDifficultyLevel(tp.getPart().getDifficultyLevel().getName());
        }
        dto.setQuestionGroupCount(tp.getTestQuestionGroups() != null
                ? tp.getTestQuestionGroups().size() : 0);
        dto.setCreatedAt(tp.getCreatedAt());
        dto.setUpdatedAt(tp.getUpdatedAt());
        return dto;
    }
}
