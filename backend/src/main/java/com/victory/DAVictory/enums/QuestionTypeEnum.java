package com.victory.DAVictory.enums;

/**
 * Enum đầy đủ các loại câu hỏi IELTS.
 * Dùng để chọn khi tạo QuestionGroup / Question.
 * Mỗi giá trị tương ứng với 1 bản ghi trong bảng question_types.
 */
public enum QuestionTypeEnum {

    // ─── Dạng trắc nghiệm (có options) ───
    MCQ("Multiple Choice", "ALL", true, false, false,
            "Chọn đáp án đúng từ A, B, C, D"),

    /** Nhiều câu dùng chung một bảng chữ A/B/C…; đáp án mỗi câu là một chữ cái (dropdown). */
    MCQ_DROPDOWN("Multiple Choice (Dropdown / Shared options)", "LISTENING_READING", true, false, false,
            "Nhiều câu dùng chung bộ lựa chọn; mỗi câu chọn đúng một chữ cái"),

    TFNG("True/False/Not Given", "READING", true, false, false,
            "Xác định thông tin là TRUE, FALSE hay NOT GIVEN"),

    YNNG("Yes/No/Not Given", "READING", true, false, false,
            "Xác định quan điểm tác giả: YES, NO hay NOT GIVEN"),

    // ─── Dạng điền (có text answer) ───
    FILL_BLANK("Fill in the Blank", "LISTENING_READING", false, true, false,
            "Điền từ/cụm từ vào chỗ trống"),

    SENTENCE_COMPLETION("Sentence Completion", "LISTENING_READING", false, true, false,
            "Hoàn thành câu bằng từ/cụm từ từ bài"),

    SUMMARY_COMPLETION("Summary Completion", "LISTENING_READING", false, true, false,
            "Hoàn thành bản tóm tắt bằng từ cho sẵn hoặc từ bài"),

    NOTE_COMPLETION("Note/Table/Form Completion", "LISTENING", false, true, false,
            "Hoàn thành ghi chú/bảng/form bằng từ nghe được"),

    SHORT_ANSWER("Short Answer", "LISTENING_READING", false, true, false,
            "Trả lời câu hỏi bằng từ/cụm từ ngắn"),

    MAP_DIAGRAM("Map/Diagram Labelling", "LISTENING", false, true, false,
            "Gắn nhãn vào bản đồ/sơ đồ"),

    FLOW_CHART("Flow-chart Completion", "LISTENING", false, true, false,
            "Hoàn thành sơ đồ quy trình"),

    // ─── Dạng nối (matching) ───
    MATCHING("Matching", "READING", false, false, true,
            "Nối thông tin giữa hai cột (features, sentence endings...)"),

    MATCHING_HEADINGS("Matching Headings", "READING", false, false, true,
            "Nối tiêu đề phù hợp với từng đoạn văn"),

    // ─── Dạng viết (Writing) ───
    LETTER("Letter (General Writing)", "WRITING", false, false, false,
            "Viết thư cho Writing Task 1 General Training"),

    ESSAY("Essay (Academic Writing)", "WRITING", false, false, false,
            "Viết bài luận cho Writing Task 2");

    private final String displayName;
    private final String applicableSkills;
    private final boolean hasOptions;
    private final boolean hasTextAnswer;
    private final boolean hasMatching;
    private final String description;

    QuestionTypeEnum(String displayName, String applicableSkills,
                     boolean hasOptions, boolean hasTextAnswer, boolean hasMatching,
                     String description) {
        this.displayName = displayName;
        this.applicableSkills = applicableSkills;
        this.hasOptions = hasOptions;
        this.hasTextAnswer = hasTextAnswer;
        this.hasMatching = hasMatching;
        this.description = description;
    }

    public String getDisplayName() { return displayName; }
    public String getApplicableSkills() { return applicableSkills; }
    public boolean isHasOptions() { return hasOptions; }
    public boolean isHasTextAnswer() { return hasTextAnswer; }
    public boolean isHasMatching() { return hasMatching; }
    public String getDescription() { return description; }

    /**
     * Tìm enum từ code string (case-insensitive).
     * Ví dụ: fromCode("mcq") → MCQ
     */
    public static QuestionTypeEnum fromCode(String code) {
        if (code == null) return null;
        try {
            return valueOf(code.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Không tìm thấy loại câu hỏi: " + code
                    + ". Các giá trị hợp lệ: " + java.util.Arrays.toString(values()));
        }
    }
}
