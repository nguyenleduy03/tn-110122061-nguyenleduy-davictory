package com.victory.DAVictory.dto;

import lombok.Data;
import java.util.List;

@Data
public class AIGradingHistoryRequest {
    private String essayText;
    private String taskType;
    private String topic;
    private String promptText;
    private String chartType;
    private String essayType;
    private String letterType;
    private Double overallBand;
    private Double taskResponse;
    private Double coherenceCohesion;
    private Double lexicalResource;
    private Double grammaticalRange;
    private String overallFeedback;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> improvementPriority;
    private String provider;
    private String model;
}
