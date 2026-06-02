package com.victory.aiwriting.infrastructure.vector;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class VectorStoreInitializer implements CommandLineRunner {

    @Override
    public void run(String... args) {
        log.info("Vector store ready (SimpleVectorStore with TransformersEmbeddingModel)");
    }
}
