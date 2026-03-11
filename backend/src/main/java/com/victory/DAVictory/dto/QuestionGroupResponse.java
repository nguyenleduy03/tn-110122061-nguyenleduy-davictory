package com.victory.DAVictory.dto;

import com.victory.DAVictory.entity.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class QuestionGroupResponse {
    private Long id;
    private Long partId;
    private String partName;
    private Long questionTypeId;
    private String questionTypeCode;
    private String questionTypeName;
    private Boolean hasOptions;
    private Boolean hasTextAnswer;
    private Boolean hasMatching;
    private String title;
    private String contentType;
    private String passageText;
    private String audioUrl;
    private String imageUrl;
    private String resourceUrl;
    private Integer fromQuestion;
    private Integer toQuestion;
    private Integer orderIndex;
    private Boolean isActive;
    private Integer questionCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuestionResp> questions;
    private List<MatchingPairResp> matchingPairs;

    @Data
    public static class QuestionResp {
        private Long id;
        private Integer questionNumber;
        private String questionText;
        private String blankContext;
        private String imageUrl;
        private Double points;
        private Integer orderIndex;
        private Boolean isActive;
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
        private Integer blankIndex;
        private String wordLimit;
    }

    @Data
    public static class MatchingPairResp {
        private Long id;
        private String leftLabel;
        private String leftContent;
        private String rightLabel;
        private String rightContent;
        private String matchType;
        private Integer orderIndex;
    }

    // ===== Factory Methods =====

    public static QuestionGroupResponse fromEntity(QuestionGroup group) {
        QuestionGroupResponse dto = new QuestionGroupResponse();
        dto.setId(group.getId());
        dto.setPartId(group.getPart().getId());
        dto.setPartName(group.getPart().getName());
        if (group.getQuestionType() != null) {
            dto.setQuestionTypeId(group.getQuestionType().getId());
            dto.setQuestionTypeCode(group.getQuestionType().getCode());
            dto.setQuestionTypeName(group.getQuestionType().getDisplayName());
            dto.setHasOptions(group.getQuestionType().getHasOptions());
            dto.setHasTextAnswer(group.getQuestionType().getHasTextAnswer());
            dto.setHasMatching(group.getQuestionType().getHasMatching());
        }
        dto.setTitle(group.getTitle());
        dto.setContentType(group.getContentType());
        dto.setPassageText(group.getPassageText());
        dto.setAudioUrl(group.getAudioUrl());
        dto.setImageUrl(group.getImageUrl());
        dto.setResourceUrl(group.getResourceUrl());
        dto.setFromQuestion(group.getFromQuestion());
        dto.setToQuestion(group.getToQuestion());
        dto.setOrderIndex(group.getOrderIndex());
        dto.setIsActive(group.getIsActive());
        dto.setQuestionCount(group.getQuestions() != null ? group.getQuestions().size() : 0);
        dto.setCreatedAt(group.getCreatedAt());
        dto.setUpdatedAt(group.getUpdatedAt());

        if (group.getQuestions() != null) {
            dto.setQuestions(group.getQuestions().stream()
                    .map(QuestionGroupResponse::toQuestionResp)
                    .collect(Collectors.toList()));
        }

        if (group.getMatchingPairs() != null) {
            dto.setMatchingPairs(group.getMatchingPairs().stream()
                    .map(QuestionGroupResponse::toMatchingPairResp)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    /**
     * Trả về response nhẹ (không kèm questions chi tiết) — dùng cho list
     */
    public static QuestionGroupResponse fromEntitySummary(QuestionGroup group) {
        QuestionGroupResponse dto = new QuestionGroupResponse();
        dto.setId(group.getId());
        dto.setPartId(group.getPart().getId());
        dto.setPartName(group.getPart().getName());
        if (group.getQuestionType() != null) {
            dto.setQuestionTypeId(group.getQuestionType().getId());
            dto.setQuestionTypeCode(group.getQuestionType().getCode());
            dto.setQuestionTypeName(group.getQuestionType().getDisplayName());
            dto.setHasOptions(group.getQuestionType().getHasOptions());
            dto.setHasTextAnswer(group.getQuestionType().getHasTextAnswer());
            dto.setHasMatching(group.getQuestionType().getHasMatching());
        }
        dto.setTitle(group.getTitle());
        dto.setContentType(group.getContentType());
        dto.setFromQuestion(group.getFromQuestion());
        dto.setToQuestion(group.getToQuestion());
        dto.setOrderIndex(group.getOrderIndex());
        dto.setIsActive(group.getIsActive());
        dto.setQuestionCount(group.getQuestions() != null ? group.getQuestions().size() : 0);
        dto.setCreatedAt(group.getCreatedAt());
        dto.setUpdatedAt(group.getUpdatedAt());
        return dto;
    }

    private static QuestionResp toQuestionResp(Question q) {
        QuestionResp resp = new QuestionResp();
        resp.setId(q.getId());
        resp.setQuestionNumber(q.getQuestionNumber());
        resp.setQuestionText(q.getQuestionText());
        resp.setBlankContext(q.getBlankContext());
        resp.setImageUrl(q.getImageUrl());
        resp.setPoints(q.getPoints());
        resp.setOrderIndex(q.getOrderIndex());
        resp.setIsActive(q.getIsActive());

        if (q.getQuestionType() != null) {
            resp.setQuestionTypeId(q.getQuestionType().getId());
            resp.setQuestionTypeCode(q.getQuestionType().getCode());
            resp.setQuestionTypeName(q.getQuestionType().getDisplayName());
        }

        if (q.getOptions() != null) {
            resp.setOptions(q.getOptions().stream().map(o -> {
                OptionResp opt = new OptionResp();
                opt.setId(o.getId());
                opt.setOptionLabel(o.getOptionLabel());
                opt.setOptionText(o.getOptionText());
                opt.setIsCorrect(o.getIsCorrect());
                opt.setOrderIndex(o.getOrderIndex());
                return opt;
            }).collect(Collectors.toList()));
        }

        if (q.getAnswers() != null) {
            resp.setAnswers(q.getAnswers().stream().map(a -> {
                AnswerResp ans = new AnswerResp();
                ans.setId(a.getId());
                ans.setAnswerText(a.getAnswerText());
                ans.setAlternativeAnswers(a.getAlternativeAnswers());
                ans.setIsCaseSensitive(a.getIsCaseSensitive());
                ans.setBlankIndex(a.getBlankIndex());
                ans.setWordLimit(a.getWordLimit());
                return ans;
            }).collect(Collectors.toList()));
        }

        return resp;
    }

    private static MatchingPairResp toMatchingPairResp(MatchingPair mp) {
        MatchingPairResp resp = new MatchingPairResp();
        resp.setId(mp.getId());
        resp.setLeftLabel(mp.getLeftLabel());
        resp.setLeftContent(mp.getLeftContent());
        resp.setRightLabel(mp.getRightLabel());
        resp.setRightContent(mp.getRightContent());
        resp.setMatchType(mp.getMatchType());
        resp.setOrderIndex(mp.getOrderIndex());
        return resp;
    }
}
