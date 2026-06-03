package com.victory.aispeaking.application.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class SubmitAnswerRequest {
    @NotBlank
    private String answerText;
    private Integer durationMs;
}
