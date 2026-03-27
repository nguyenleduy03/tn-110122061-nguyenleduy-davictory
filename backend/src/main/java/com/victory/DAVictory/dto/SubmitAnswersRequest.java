package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class SubmitAnswersRequest {
    private Long attemptId;
    private Long sessionId; // null = submit all, có giá trị = submit single skill
    private List<QuestionAnswer> answers;
    private Boolean isFinalSubmit; // true = nộp bài cuối cùng, false = lưu tạm
    
    @Data
    public static class QuestionAnswer {
        private Long questionId;
        private String answerText; // Câu trả lời dạng text
        private List<String> answerList; // Câu trả lời dạng list (multiple choice, matching)
        private Boolean isFlagged; // Đánh dấu câu hỏi để xem lại
        private Integer timeSpentSeconds; // Thời gian làm câu này
    }
}
