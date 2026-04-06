package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO trả về toàn bộ cấu trúc đề thi bao gồm câu hỏi lồng sâu.
 * Dùng cho: GET /api/test-builder/{id}/full
 */
@Data
public class TestFullResponse {

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
    private String createdByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SessionResp> sessions;

    @Data
    public static class SessionResp {
        private Long testSessionId;
        private Long sessionId;
        private String name;
        private SkillType skillType;
        private Integer orderIndex;
        private Integer durationMinutes;
        private String instructions;
        private Integer totalQuestions;
        private List<PartResp> parts;
    }

    @Data
    public static class PartResp {
        private Long testPartId;
        private Long partId;
        private String name;
        private Integer orderIndex;
        private Integer totalQuestions;
        private String instructions;
        private List<GroupResp> questionGroups;
    }

    @Data
    public static class GroupResp {
        private Long testQuestionGroupId;
        private Long questionGroupId;
        private String title;
        private String instructions;
        private String contentType;
        private String passageText;
        private String audioUrl;
        private Integer audioPlayCount;
        private String imageUrl;
        private Integer imageWidth;
        private Integer fromQuestion;
        private Integer toQuestion;
        private Integer orderIndex;
        private Boolean hideOptionsTable;
        private List<QuestionResp> questions;
    }

    @Data
    public static class QuestionResp {
        private Long id;
        private Integer questionNumber;
        private Integer questionCount; // Số câu hỏi hiển thị
        private String questionSection; // top | image | bottom cho IMAGE_NOTE_FORM
        private String groupInstruction; // Instruction chung cho nhóm câu
        private String questionText;
        private String blankContext;
        private Double pinX;
        private Double pinY;
        private String imageUrl;
        private Double points;
        private Integer orderIndex;
        private Long questionTypeId;
        private String questionTypeCode;
        private String questionTypeName;
        private List<OptionResp> options;
        private List<AnswerResp> answers;
    }

    @Data
    public static class OptionResp {
        private Long id;
        private String optionLabel;
        private String optionText;
        private Boolean isCorrect;
        private Integer orderIndex;
    }

    @Data
    public static class AnswerResp {
        private Long id;
        private String answerText;
        private String alternativeAnswers;
        private Boolean isCaseSensitive;
        private Boolean isSample;
        private Integer blankIndex;
        private String wordLimit;
    }
}
