package com.victory.aiwriting.seed;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WritingRubricSeeder implements CommandLineRunner {

    @PersistenceContext
    private EntityManager em;

    @Override
    public void run(String... args) {
        var count = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM writing_scoring_criteria")
            .getSingleResult()).longValue();
        if (count > 0) {
            log.info("Rubric already seeded ({} criteria)", count);
            return;
        }

        seedTaskType("TASK1_ACADEMIC", "TA", "Task Achievement");
        seedTaskType("TASK1_GENERAL", "TA", "Task Achievement");
        seedTaskType("TASK2_ACADEMIC", "TR", "Task Response");
        seedTaskType("TASK2_GENERAL", "TR", "Task Response");

        seedTaskType("TASK1_ACADEMIC", "CC", "Coherence & Cohesion");
        seedTaskType("TASK1_GENERAL", "CC", "Coherence & Cohesion");
        seedTaskType("TASK2_ACADEMIC", "CC", "Coherence & Cohesion");
        seedTaskType("TASK2_GENERAL", "CC", "Coherence & Cohesion");

        seedTaskType("TASK1_ACADEMIC", "LR", "Lexical Resource");
        seedTaskType("TASK1_GENERAL", "LR", "Lexical Resource");
        seedTaskType("TASK2_ACADEMIC", "LR", "Lexical Resource");
        seedTaskType("TASK2_GENERAL", "LR", "Lexical Resource");

        seedTaskType("TASK1_ACADEMIC", "GRA", "Grammatical Range & Accuracy");
        seedTaskType("TASK1_GENERAL", "GRA", "Grammatical Range & Accuracy");
        seedTaskType("TASK2_ACADEMIC", "GRA", "Grammatical Range & Accuracy");
        seedTaskType("TASK2_GENERAL", "GRA", "Grammatical Range & Accuracy");

        log.info("Seed 16 rubric criteria with official IELTS band descriptors");
    }

    private void seedTaskType(String taskCode, String criteriaCode, String displayName) {
        var taskId = getId("SELECT id FROM writing_tasks WHERE code = :code", taskCode);
        if (taskId == null) {
            em.createNativeQuery("""
                INSERT INTO writing_tasks (code, display_name, description, duration_minutes,
                    min_words, recommended_words, order_index, score_weight, is_active, created_at, updated_at)
                VALUES (:code, :displayName, '', 40, 250, 300, 1, 1, true, NOW(), NOW())
                """)
                .setParameter("code", taskCode)
                .setParameter("displayName", displayNameForTask(taskCode))
                .executeUpdate();
            taskId = getId("SELECT id FROM writing_tasks WHERE code = :code", taskCode);
            if (taskId == null) return;
        }

        String bandDescriptorsJson = buildBandDescriptorsJson(criteriaCode, taskCode);

        em.createNativeQuery("""
            INSERT INTO writing_scoring_criteria
                (writing_task_id, code, display_name, description, weight, max_score,
                 order_index, band_descriptors, is_active, created_at, updated_at)
            VALUES (:taskId, :code, :displayName, :description, 0.25, 9.0,
                    :orderIndex, :bandDescriptors, true, NOW(), NOW())
            """)
            .setParameter("taskId", taskId)
            .setParameter("code", criteriaCode)
            .setParameter("displayName", displayName)
            .setParameter("description", getDescription(criteriaCode))
            .setParameter("orderIndex", getOrder(criteriaCode))
            .setParameter("bandDescriptors", bandDescriptorsJson)
            .executeUpdate();
    }

    private String buildBandDescriptorsJson(String criteriaCode, String taskCode) {
        try {
            var map = new LinkedHashMap<String, Object>();
            var descriptors = getDescriptors(criteriaCode, taskCode);
            for (int band = 0; band <= 9; band++) {
                var bandMap = new LinkedHashMap<String, Object>();
                bandMap.put("score", (double) band);

                var d = descriptors[band];
                bandMap.put("descriptor", d[0]);
                bandMap.put("summary", d[1]);
                bandMap.put("keyIndicators", List.of((String[]) d[2]));
                bandMap.put("commonErrors", List.of((String[]) d[3]));

                map.put("band" + band, bandMap);
            }
            return new ObjectMapper().writeValueAsString(map);
        } catch (Exception e) {
            log.error("Failed to build descriptors JSON", e);
            return "{}";
        }
    }

    private Object[][] getDescriptors(String criteriaCode, String taskCode) {
        var all = getOfficialIELTSDescriptors();
        var key = criteriaCode + "_" + (taskCode.startsWith("TASK1") ? "TASK1" : "TASK2");
        return all.getOrDefault(key, getDefaultDescriptors(criteriaCode));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object[][]> getOfficialIELTSDescriptors() {
        var map = new LinkedHashMap<String, Object[][]>();

        // ======================= TASK RESPONSE (Task 2) =======================
        map.put("TR_TASK2", new Object[][]{
            /*0*/ desc("Does not attend to the task", "No response", new String[]{"No content"}, new String[]{"No attempt"}),
            /*1*/ desc("Does not attend to the task; fails to address the task", "Minimal response", new String[]{"No relevant content"}, new String[]{"Off-topic"}),
            /*2*/ desc("May attempt to address the task but mainly uses language of task", "Limited response", new String[]{"Minimal task response", "No position"}, new String[]{"Copies from task", "No development"}),
            /*3*/ desc("Addresses the task only partially; presents limited ideas", "Partial response", new String[]{"Addresses task partially", "Underdeveloped ideas"}, new String[]{"Limited position", "Insufficient detail"}),
            /*4*/ desc("Attempts to address the task but main ideas are insufficiently developed", "Inadequate response", new String[]{"Attempted task response", "Underdeveloped main ideas"}, new String[]{"Unclear position", "Inadequate support"}),
            /*5*/ desc("Addresses the task only partially, format may be inappropriate; expresses a position but development is limited", "Partially addresses task", new String[]{"Partial task coverage", "Limited development"}, new String[]{"Inappropriate format", "Limited position"}),
            /*6*/ desc("Addresses all parts of the task though some parts may be more fully covered than others; presents a relevant position though conclusions may become unclear or repetitive", "Adequate task response", new String[]{"Addresses all parts", "Clear position"}, new String[]{"Uneven development", "Repetitive conclusion"}),
            /*7*/ desc("Addresses all parts of the task; presents a clear position throughout; main ideas are extended and supported but may be overly general", "Good task response", new String[]{"Clear position throughout", "Extended main ideas"}, new String[]{"Overly general support", "Some redundancy"}),
            /*8*/ desc("Sufficiently addresses all parts of the task; presents a well-developed response to the question with relevant, extended, and supported ideas", "Very good task response", new String[]{"Well-developed ideas", "Strong position"}, new String[]{"May lack precision in places", "Minor overgeneralization"}),
            /*9*/ desc("Fully addresses all parts of the task with very fully developed ideas; presents a fully developed position with relevant, fully extended, and well-supported ideas", "Excellent task response", new String[]{"Fully developed ideas", "Well-supported arguments"}, new String[]{}),
        });

        // ======================= TASK ACHIEVEMENT (Task 1) =======================
        map.put("TA_TASK1", new Object[][]{
            /*0*/ desc("Does not attend to the task", "No response", new String[]{"No content"}, new String[]{"No attempt"}),
            /*1*/ desc("Does not attend to the task; fails to address the task", "Minimal attempt", new String[]{"No relevant data"}, new String[]{"Completely off-task"}),
            /*2*/ desc("May attempt to address the task but mainly uses language of task", "Limited attempt", new String[]{"Minimal data description"}, new String[]{"No overview", "Copies from task"}),
            /*3*/ desc("Addresses the task only partially; format may be inappropriate; no data to support description", "Partial attempt", new String[]{"Partial data coverage"}, new String[]{"No data support", "Inappropriate format"}),
            /*4*/ desc("Attempts to address the task but main features are insufficiently described", "Inadequate", new String[]{"Some features identified"}, new String[]{"Insufficient detail", "Missing overview"}),
            /*5*/ desc("Generally addresses the task; format may be inappropriate; describes data but details may be irrelevant or inaccurate", "Partially accurate", new String[]{"Key features identified", "Some data description"}, new String[]{"Inaccurate data", "Missing overview", "Inappropriate format"}),
            /*6*/ desc("Addresses the requirements of the task; presents an overview with information appropriately selected; presents and adequately highlights key features", "Adequate", new String[]{"Overview present", "Key features highlighted"}, new String[]{"Some irrelevant detail", "Inaccurate data points"}),
            /*7*/ desc("Presents a clear overview of main trends/differences/stages; clearly presents and highlights key features with appropriate detail", "Good", new String[]{"Clear overview", "Well-described features"}, new String[]{"May over-generalize", "Minor inaccuracies"}),
            /*8*/ desc("Presents a clear and well-developed overview; clearly presents and fully describes key features with well-selected data", "Very good", new String[]{"Well-developed overview", "Precise data"}, new String[]{}),
            /*9*/ desc("Fully satisfies all requirements of the task; clearly presents a fully developed response with well-integrated data", "Excellent", new String[]{"Fully satisfies task", "Well-integrated data"}, new String[]{}),
        });

        // ======================= COHERENCE & COHESION =======================
        var ccBands = new Object[][]{
            /*0*/ desc("No communication", "No organization", new String[]{"No recognizable structure"}, new String[]{"No text"}),
            /*1*/ desc("No organization", "No structure", new String[]{"No logical structure"}, new String[]{"Cannot follow"}),
            /*2*/ desc("No organizational structure; cannot follow", "No structure", new String[]{"Minimal structure"}, new String[]{"Unable to follow"}),
            /*3*/ desc("Limited organization; unable to follow progression", "Poor organization", new String[]{"Some structure but disjointed"}, new String[]{"Limited linking", "Hard to follow"}),
            /*4*/ desc("Presents information with some organization but there may be a lack of overall progression; uses some basic cohesive devices but may be repetitive or inaccurate", "Basic organization", new String[]{"Basic structure", "Some cohesion"}, new String[]{"Lack of progression", "Repetitive devices"}),
            /*5*/ desc("Presents information with some organization but there may be a lack of overall progression; makes inadequate/inaccurate use of cohesive devices", "Limited organization", new String[]{"Some organization", "Basic cohesive devices"}, new String[]{"Lack of progression", "Inaccurate cohesion"}),
            /*6*/ desc("Arranges information and ideas coherently and there is a clear overall progression; uses cohesive devices effectively but cohesion within and/or between sentences may be faulty or mechanical", "Adequate organization", new String[]{"Clear progression", "Effective cohesion"}, new String[]{"Mechanical linking", "Faulty within-sentence cohesion"}),
            /*7*/ desc("Logically organizes information and ideas; there is clear progression throughout; uses a range of cohesive devices appropriately", "Good organization", new String[]{"Logical organization", "Range of devices"}, new String[]{"Some overuse of devices", "Minor issues"}),
            /*8*/ desc("Sequences information and ideas logically; manages all aspects of cohesion well; uses paragraphing sufficiently and appropriately", "Very good organization", new String[]{"Logical sequencing", "Skilled cohesion"}, new String[]{"Occasional underuse of devices"}),
            /*9*/ desc("Uses cohesion in such a way that it attracts no attention; skillfully manages paragraphing", "Excellent organization", new String[]{"Seamless cohesion", "Skilled paragraphing"}, new String[]{}),
        };
        map.put("CC_TASK1", ccBands);
        map.put("CC_TASK2", ccBands);

        // ======================= LEXICAL RESOURCE =======================
        var lrBands = new Object[][]{
            /*0*/ desc("No vocabulary", "No vocabulary", new String[]{"No recognizable words"}, new String[]{}),
            /*1*/ desc("Only isolated words", "Minimal vocabulary", new String[]{"Isolated words only"}, new String[]{"No communication"}),
            /*2*/ desc("Limited vocabulary; no control", "Very limited vocabulary", new String[]{"Basic words only"}, new String[]{"Frequent errors", "No control"}),
            /*3*/ desc("Uses a limited range of vocabulary with minimal control", "Limited vocabulary", new String[]{"Narrow range"}, new String[]{"Limited control", "Frequent errors"}),
            /*4*/ desc("Uses a limited range of vocabulary; makes many errors in word choice; limited control of word formation", "Inadequate vocabulary", new String[]{"Limited range", "Awareness of style"}, new String[]{"Many word choice errors", "Limited control"}),
            /*5*/ desc("Uses a limited range of vocabulary but this is minimally adequate for the task; may make noticeable errors in spelling/word formation", "Limited but adequate", new String[]{"Adequate for task", "Some less common words"}, new String[]{"Noticeable errors", "Limited precision"}),
            /*6*/ desc("Uses an adequate range of vocabulary for the task; attempts to use less common vocabulary but with some inaccuracy; makes some errors in spelling/word formation", "Adequate vocabulary", new String[]{"Adequate range", "Attempts less common vocab"}, new String[]{"Some inaccuracy", "Spelling errors"}),
            /*7*/ desc("Uses a sufficient range of vocabulary to allow some flexibility and precision; uses less common and idiomatic vocabulary skillfully with occasional inaccuracies", "Good vocabulary", new String[]{"Flexible range", "Good use of less common vocab"}, new String[]{"Occasional inaccuracies", "Minor overuse"}),
            /*8*/ desc("Uses a wide range of vocabulary fluently and flexibly to convey precise meanings; skillfully uses uncommon lexical items but there may be occasional inaccuracies in word choice", "Very good vocabulary", new String[]{"Wide range", "Precise meanings"}, new String[]{"Occasional inaccuracies", "Rare errors"}),
            /*9*/ desc("Uses a wide range of vocabulary with very natural and sophisticated control of lexical features; rare minor errors occur only as 'slips'", "Excellent vocabulary", new String[]{"Sophisticated control", "Natural usage"}, new String[]{}),
        };
        map.put("LR_TASK1", lrBands);
        map.put("LR_TASK2", lrBands);

        // ======================= GRAMMATICAL RANGE & ACCURACY =======================
        var graBands = new Object[][]{
            /*0*/ desc("No grammatical structures", "No grammar", new String[]{"No recognizable structures"}, new String[]{}),
            /*1*/ desc("No grammatical structures; only isolated words", "Minimal grammar", new String[]{"No sentence forms"}, new String[]{"No control"}),
            /*2*/ desc("Very limited grammatical control; no sentence forms", "Very limited grammar", new String[]{"Basic phrases only"}, new String[]{"No sentence control"}),
            /*3*/ desc("Uses a limited range of grammatical structures with minimal control", "Limited grammar", new String[]{"Simple structures only"}, new String[]{"Frequent errors", "Minimal control"}),
            /*4*/ desc("Uses a very limited range of grammatical structures; makes frequent grammatical errors; punctuation may be faulty", "Inadequate grammar", new String[]{"Very limited range", "Some complex attempts"}, new String[]{"Frequent errors", "Faulty punctuation"}),
            /*5*/ desc("Uses only a limited range of structures; attempts complex sentences but these tend to be less accurate than simple sentences; makes some grammatical errors", "Limited but adequate", new String[]{"Limited range", "Complex sentence attempts"}, new String[]{"Errors in complex sentences", "Inconsistent punctuation"}),
            /*6*/ desc("Uses a mix of simple and complex sentence forms; makes some grammatical errors and punctuation may be faulty", "Adequate grammar", new String[]{"Mix of structures", "Some complex sentences"}, new String[]{"Some errors", "Faulty punctuation"}),
            /*7*/ desc("Uses a variety of complex structures; produces frequent error-free sentences; has good control of grammar and punctuation but may make a few errors", "Good grammar", new String[]{"Variety of structures", "Error-free sentences"}, new String[]{"Few errors", "Minor punctuation issues"}),
            /*8*/ desc("Uses a wide range of grammatical structures; the majority of sentences are error-free; makes only very occasional errors or inappropriacies", "Very good grammar", new String[]{"Wide range", "Fluent accuracy"}, new String[]{"Very occasional errors", "Rare inappropriacies"}),
            /*9*/ desc("Uses a wide range of grammatical structures with full flexibility and accuracy; rare minor errors occur only as 'slips'", "Excellent grammar", new String[]{"Full flexibility", "Complete accuracy"}, new String[]{}),
        };
        map.put("GRA_TASK1", graBands);
        map.put("GRA_TASK2", graBands);

        return map;
    }

    private Object[][] getDefaultDescriptors(String criteriaCode) {
        var d = new Object[10][4];
        for (int i = 0; i <= 9; i++) {
            d[i] = desc("Band " + i + " descriptor for " + criteriaCode, "Band " + i,
                new String[]{}, new String[]{});
        }
        return d;
    }

    private Object[] desc(String descriptor, String summary, String[] indicators, String[] errors) {
        return new Object[]{descriptor, summary, indicators, errors};
    }

    private String displayNameForTask(String taskCode) {
        return switch (taskCode) {
            case "TASK1_ACADEMIC" -> "IELTS Writing Task 1 (Academic)";
            case "TASK1_GENERAL" -> "IELTS Writing Task 1 (General Training)";
            case "TASK2_ACADEMIC" -> "IELTS Writing Task 2 (Academic)";
            case "TASK2_GENERAL" -> "IELTS Writing Task 2 (General Training)";
            default -> taskCode;
        };
    }

    private String getDescription(String code) {
        return switch (code) {
            case "TA", "TR" -> "Measures how well the task requirements are addressed";
            case "CC" -> "Measures the organization and cohesion of the response";
            case "LR" -> "Measures vocabulary range and accuracy";
            case "GRA" -> "Measures grammatical range and accuracy";
            default -> "";
        };
    }

    private int getOrder(String code) {
        return switch (code) {
            case "TA", "TR" -> 1;
            case "CC" -> 2;
            case "LR" -> 3;
            case "GRA" -> 4;
            default -> 5;
        };
    }

    private Long getId(String query, String param) {
        var result = em.createNativeQuery(query).setParameter("code", param).getResultList();
        return result.isEmpty() ? null : ((Number) result.get(0)).longValue();
    }
}
