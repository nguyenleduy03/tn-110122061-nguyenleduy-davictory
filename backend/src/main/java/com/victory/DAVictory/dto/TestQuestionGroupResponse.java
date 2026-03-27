package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.TestQuestionGroup;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TestQuestionGroupResponse {
    private Long id;
    private Long testPartId;
    private Long questionGroupId;
    private Long questionTypeId;
    private String questionTypeCode;
    private String questionTypeName;
    private String title;                   // customTitle hoặc group.title
    private String instructions;            // instructions từ QuestionGroup
    private String contentType;
    private String passageText;
    private String audioUrl;
    private String imageUrl;
    private Integer imageWidth;
    private Integer fromQuestion;           // customFrom hoặc group.fromQuestion
    private Integer toQuestion;             // customTo hoặc group.toQuestion
    private Integer orderIndex;
    private Boolean isRandomOrder;
    private String customTitle;
    private String customInstructions;
    private Integer questionCount;          // Số câu hỏi trong group
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TestQuestionGroupResponse fromEntity(TestQuestionGroup tqg) {
        TestQuestionGroupResponse dto = new TestQuestionGroupResponse();
        dto.setId(tqg.getId());
        dto.setTestPartId(tqg.getTestPart().getId());
        dto.setQuestionGroupId(tqg.getQuestionGroup().getId());

        // Gán thông tin loại câu hỏi từ group
        if (tqg.getQuestionGroup().getQuestionType() != null) {
            dto.setQuestionTypeId(tqg.getQuestionGroup().getQuestionType().getId());
            dto.setQuestionTypeCode(tqg.getQuestionGroup().getQuestionType().getCode());
            dto.setQuestionTypeName(tqg.getQuestionGroup().getQuestionType().getDisplayName());
        }

        // Hiển thị customTitle nếu có, ngược lại dùng title gốc
        dto.setCustomTitle(tqg.getCustomTitle());
        dto.setTitle(tqg.getCustomTitle() != null
                ? tqg.getCustomTitle()
                : tqg.getQuestionGroup().getTitle());

        // Hiển thị customInstructions nếu có, ngược lại dùng instructions gốc
        dto.setInstructions(tqg.getCustomInstructions() != null
                ? tqg.getCustomInstructions()
                : tqg.getQuestionGroup().getInstructions());

        dto.setContentType(tqg.getQuestionGroup().getContentType());
        dto.setPassageText(tqg.getQuestionGroup().getPassageText());
        dto.setAudioUrl(tqg.getQuestionGroup().getAudioUrl());
        dto.setImageUrl(tqg.getQuestionGroup().getImageUrl());
        dto.setImageWidth(tqg.getQuestionGroup().getImageWidth());

        // Hiển thị question range: tùy chỉnh nếu có, ngược lại dùng gốc
        dto.setFromQuestion(tqg.getQuestionFrom() != null
                ? tqg.getQuestionFrom()
                : tqg.getQuestionGroup().getFromQuestion());
        dto.setToQuestion(tqg.getQuestionTo() != null
                ? tqg.getQuestionTo()
                : tqg.getQuestionGroup().getToQuestion());

        dto.setOrderIndex(tqg.getOrderIndex());
        dto.setIsRandomOrder(tqg.getIsRandomOrder());
        dto.setCustomInstructions(tqg.getCustomInstructions());

        dto.setQuestionCount(tqg.getQuestionGroup().getQuestions() != null
                ? tqg.getQuestionGroup().getQuestions().size() : 0);

        dto.setCreatedAt(tqg.getCreatedAt());
        dto.setUpdatedAt(tqg.getUpdatedAt());
        return dto;
    }
}
