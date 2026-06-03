package com.victory.aispeaking.controller;

import com.victory.aispeaking.exception.AIProviderException;
import com.victory.aispeaking.exception.QuotaExceededException;
import com.victory.aispeaking.exception.SpeakingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class SpeakingExceptionHandler {

    @ExceptionHandler(QuotaExceededException.class)
    public ResponseEntity<?> handleQuotaExceeded(QuotaExceededException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of(
                    "error", "quota_exceeded",
                    "message", e.getMessage(),
                    "timestamp", LocalDateTime.now().toString()
                ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                    "error", "bad_request",
                    "message", e.getMessage(),
                    "timestamp", LocalDateTime.now().toString()
                ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleStateError(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of(
                    "error", "state_error",
                    "message", e.getMessage(),
                    "timestamp", LocalDateTime.now().toString()
                ));
    }

    @ExceptionHandler(AIProviderException.class)
    public ResponseEntity<?> handleAIProviderError(AIProviderException e) {
        log.error("AI provider error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "ai_provider_error",
                    "message", e.getMessage(),
                    "timestamp", LocalDateTime.now().toString()
                ));
    }

    @ExceptionHandler(SpeakingException.class)
    public ResponseEntity<?> handleSpeakingError(SpeakingException e) {
        log.error("Speaking service error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", "speaking_error",
                    "message", e.getMessage(),
                    "timestamp", LocalDateTime.now().toString()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneralError(Exception e) {
        log.error("Unexpected error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", "internal_error",
                    "message", "An unexpected error occurred",
                    "timestamp", LocalDateTime.now().toString()
                ));
    }
}
