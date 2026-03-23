package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExamAttemptResponse {

    private Long id;
    private Long testId;
    private String testTitle;
    private Long sessionId;
    private SkillType skillType;

    private Long userId;
    private String username;

    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime gradedAt;

    private Integer timeLimitSeconds;
    private Integer timeSpentSeconds;

    private Integer totalAnswered;
    private Integer totalCorrect;
    private Double rawScore;
    private Double bandScore;
    private String feedback;

    private Integer attemptNumber;
    
    // Chi tiết câu trả lời (chỉ có khi GV xem)
    private List<AttemptAnswerSave> answers;
}
