package com.victory.aispeaking.exception;

public class SpeakingException extends RuntimeException {
    public SpeakingException(String message) {
        super(message);
    }

    public SpeakingException(String message, Throwable cause) {
        super(message, cause);
    }
}
