package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.TestType;
import lombok.Data;

import java.util.List;

/**
 * DTO nhận toàn bộ cấu trúc đề thi từ TestBuilder frontend.
 * Cấu trúc: Test → Sessions → Parts → QuestionGroups → Questions → Options/Answers
 */
@Data
public class TestSaveRequest {

    private Long id; // null = tạo mới, có giá trị = cập nhật
    private String title;
    private String description;
    private TestType testType;
    private Boolean isFullTest;
    private Integer durationMinutes;
    private String targetBand;
    private Long createdByUserId;
    private List<SessionSave> sessions;

    @Data
    public static class SessionSave {
        private Long sessionId;       // ID của Session gốc (Listening/Reading/...)
        private Integer orderIndex;
        private Integer durationMinutes;
        private String instructions;
        private List<PartSave> parts;
    }

    @Data
    public static class PartSave {
        private Long partId;          // ID của Part gốc (Part 1, Part 2,...)
        private Integer orderIndex;
        private String name;
        private Integer totalQuestions;
        private String instructions;
        private List<GroupSave> questionGroups;
    }

    @Data
    public static class GroupSave {
        private Long existingGroupId; // != null → tham chiếu group có sẵn trong ngân hàng
        private String title;
        private String contentType;
        private String passageText;   // Nội dung bài đọc hoặc JSON metadata (bảng, sơ đồ...)
        private String audioUrl;
        private String imageUrl;
        private Integer fromQuestion;
        private Integer toQuestion;
        private Integer orderIndex;
        private List<QuestionSave> questions;
    }

    @Data
    public static class QuestionSave {
        private Long questionTypeId;
        private String questionTypeCode; // Fallback nếu không có questionTypeId
        private Integer questionNumber;
        private String questionText;
        private String blankContext;
        private String imageUrl;
        private Double points;
        private Integer orderIndex;
        private List<OptionSave> options;
        private List<AnswerSave> answers;
    }

    @Data
    public static class OptionSave {
        private String optionLabel;
        private String optionText;
        private Boolean isCorrect;
        private Integer orderIndex;
    }

    @Data
    public static class AnswerSave {
        private String answerText;
        private String alternativeAnswers;
        private Boolean isCaseSensitive;
        private Integer blankIndex;
        private String wordLimit;
    }
}
