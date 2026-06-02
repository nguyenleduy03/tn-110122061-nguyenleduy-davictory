package com.victory.aiwriting.controller;

import com.victory.aiwriting.exception.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class AIExceptionHandler {

    @ExceptionHandler(AIQuotaExceededException.class)
    public ResponseEntity<?> handleQuotaExceeded(AIQuotaExceededException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(Map.of("error", e.getMessage(), "timestamp", LocalDateTime.now()));
    }

    @ExceptionHandler(AIParseException.class)
    public ResponseEntity<?> handleParseError(AIParseException e) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", e.getMessage(), "rawResponse", e.getRawResponse()));
    }

    @ExceptionHandler(AIProviderException.class)
    public ResponseEntity<?> handleProviderError(AIProviderException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of("error", "AI service unavailable", "detail", e.getMessage()));
    }

    @ExceptionHandler(AIGradingException.class)
    public ResponseEntity<?> handleGradingError(AIGradingException e) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnknown(Exception e) {
        log.error("Unexpected error in AI grading service", e);
        return ResponseEntity.internalServerError()
            .body(Map.of("error", "Internal server error", "detail", e.getMessage()));
    }
}
