package com.victory.aispeaking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableConfigurationProperties
public class AiSpeakingApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiSpeakingApplication.class, args);
    }
}
