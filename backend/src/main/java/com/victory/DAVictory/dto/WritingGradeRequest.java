package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class WritingGradeRequest {
    private List<CriteriaScore> criteriaScores;
    private String overallFeedback;
    
    @Data
    public static class CriteriaScore {
        private Long criteriaId;
        private Double score;
        private String feedback;
    }
}
