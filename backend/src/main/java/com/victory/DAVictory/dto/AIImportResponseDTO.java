package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIImportResponseDTO {
    private String taskId;
    private String status;
    private String title;
    private String skill;
    private String testType;
    private Integer totalQuestions;
    private List<Map<String, Object>> sections;
    private String rawAiOutput;
    private String error;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateResultDTO {
        private boolean success;
        private Long testId;
        private String title;
        private String url;
        private String message;
    }
}
