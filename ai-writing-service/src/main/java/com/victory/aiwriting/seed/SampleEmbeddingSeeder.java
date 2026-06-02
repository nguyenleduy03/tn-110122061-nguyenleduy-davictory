package com.victory.aiwriting.seed;

import com.victory.aiwriting.domain.service.SampleEssayIndexer;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SampleEmbeddingSeeder implements CommandLineRunner {

    private final SampleEssayIndexer sampleEssayIndexer;

    @Override
    public void run(String... args) {
        sampleEssayIndexer.indexAll();
    }
}
