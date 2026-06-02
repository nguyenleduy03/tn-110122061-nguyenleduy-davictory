package com.victory.aiwriting.exception;

public class AIParseException extends RuntimeException {
    private final String rawResponse;

    public AIParseException(String message) {
        super(message);
        this.rawResponse = null;
    }

    public AIParseException(String message, Throwable cause, String rawResponse) {
        super(message, cause);
        this.rawResponse = rawResponse;
    }

    public String getRawResponse() {
        return rawResponse;
    }
}
