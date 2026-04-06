package com.victory.DAVictory.dto;

import lombok.Data;

import java.util.List;

/**
 * Request tạo/cập nhật QuestionGroup với tất cả câu hỏi nested bên trong.
 * Frontend gửi 1 group = 1 dạng câu hỏi (MCQ, TFNG, Fill blank...) cùng lúc.
 */
@Data
public class QuestionGroupRequest {
    private Long questionTypeId;       // ID loại câu hỏi (MCQ, TFNG, FILL_BLANK...)
    private String questionTypeCode;   // Hoặc dùng code: "MCQ", "TFNG"...
    private String title;             // "Questions 1-10", "Passage 1"
    private String instructions;      // Hướng dẫn cho group
    private String contentType;       // READING_PASSAGE, AUDIO_TRANSCRIPT, STANDALONE, DIAGRAM, MAP, TABLE
    private String passageText;       // Nội dung bài đọc/transcript
    private String audioUrl;          // URL audio (Listening)
    private String imageUrl;          // URL hình ảnh (Map, Diagram)
    private String resourceUrl;       // URL tài nguyên khác
    private Integer fromQuestion;     // Câu bắt đầu (1, 11, 21...)
    private Integer toQuestion;       // Câu kết thúc (10, 20, 30...)
    private Integer orderIndex;       // Thứ tự trong part
    private Boolean allowOptionReuse; // Cho phép sử dụng lại thẻ đã kéo
    private String sharedOptionsJson; // JSON bộ lựa chọn chung (MCQ_DROPDOWN)
    private Boolean useSharedOptions; // Sử dụng bộ lựa chọn chung
    private List<QuestionRequest> questions;
    private List<MatchingPairRequest> matchingPairs;

    @Data
    public static class QuestionRequest {
        private String questionTypeCode;    // MCQ, TFNG, FILL_BLANK, MATCHING...
        private Long questionTypeId;        // Hoặc truyền ID trực tiếp
        private Integer questionNumber;     // Số thứ tự trong đề (1-40)
        private String questionSection;     // top | image | bottom cho IMAGE_NOTE_FORM
        private String questionText;        // Nội dung câu hỏi
        private String blankContext;        // Câu chứa chỗ trống
        private String imageUrl;
        private Double points;              // Điểm (mặc định 1.0)
        private Integer orderIndex;
        private List<OptionRequest> options;
        private List<AnswerRequest> answers;
    }

    @Data
    public static class OptionRequest {
        private String optionLabel;    // A, B, C, D hoặc TRUE, FALSE, NOT GIVEN
        private String optionText;     // Nội dung lựa chọn
        private String imageUrl;       // URL ảnh cho option
        private Boolean isCorrect;
        private Integer orderIndex;
    }

    @Data
    public static class AnswerRequest {
        private String answerText;              // Đáp án chính
        private String alternativeAnswers;      // JSON: ["colour","color"]
        private Boolean isCaseSensitive;
        private Boolean isSample;               // Đáp án mẫu (hiển thị nhưng không tính điểm)
        private Integer blankIndex;             // Vị trí ô trống (1, 2, 3...)
        private String wordLimit;               // "ONE WORD ONLY", "NO MORE THAN TWO WORDS"
    }

    @Data
    public static class MatchingPairRequest {
        private String leftLabel;       // "i", "ii", "iii" hoặc "A", "B"
        private String leftContent;     // Nội dung trái
        private String rightLabel;      // "1", "2" hoặc "A", "B"
        private String rightContent;    // Nội dung phải
        private String imageUrl;        // URL ảnh cho dropdown
        private String matchType;       // HEADING_TO_PARAGRAPH, FEATURE_TO_STATEMENT...
        private Integer orderIndex;
    }
}
