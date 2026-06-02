package com.victory.aiwriting.exception;

public class AIQuotaExceededException extends RuntimeException {
    public AIQuotaExceededException(String message) {
        super(message);
    }
}
