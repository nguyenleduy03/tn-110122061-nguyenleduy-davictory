package com.victory.aiwriting.infrastructure.embedding;

import com.victory.aiwriting.domain.port.EmbeddingService;
import org.springframework.ai.transformers.TransformersEmbeddingModel;
import java.util.ArrayList;
import java.util.List;

public class TransformersEmbeddingAdapter implements EmbeddingService {

    private final TransformersEmbeddingModel embeddingModel;

    public TransformersEmbeddingAdapter(TransformersEmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    @Override
    public List<Double> embed(String text) {
        float[] floats = embeddingModel.embed(text);
        List<Double> result = new ArrayList<>(floats.length);
        for (float f : floats) result.add((double) f);
        return result;
    }

    @Override
    public List<List<Double>> embedAll(List<String> texts) {
        List<List<Double>> results = new ArrayList<>();
        for (String text : texts) {
            results.add(embed(text));
        }
        return results;
    }

    @Override
    public int getDimension() {
        return 384;
    }
}
