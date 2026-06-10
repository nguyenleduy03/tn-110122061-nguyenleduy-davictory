package com.victory.aiwriting.infrastructure.vector;

import com.victory.aiwriting.domain.port.VectorStorePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class VectorStoreInitializer implements CommandLineRunner {

    private final VectorStorePort vectorStore;

    @Override
    public void run(String... args) {
        if (vectorStore.isInitialized()) {
            log.info("Vector store ready with {} persisted documents", vectorStore.count());
        } else {
            log.info("Vector store ready (empty). Use POST /api/admin/ai/reindex to index samples.");
        }
    }
}
