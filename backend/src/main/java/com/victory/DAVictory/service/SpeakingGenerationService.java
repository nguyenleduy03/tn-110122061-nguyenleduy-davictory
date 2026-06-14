package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.SpeakingCombo;
import com.victory.DAVictory.entity.SpeakingFrame;
import com.victory.DAVictory.entity.SpeakingGeneratedQuestion;
import com.victory.DAVictory.repository.SpeakingComboRepository;
import com.victory.DAVictory.repository.SpeakingFrameRepository;
import com.victory.DAVictory.repository.SpeakingGeneratedQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpeakingGenerationService {

    private final SpeakingFrameRepository frameRepository;
    private final SpeakingComboRepository comboRepository;
    private final SpeakingGeneratedQuestionRepository snapshotRepository;
    private final Random random = new Random();

    private static final List<WarmUpQuestion> DEFAULT_WARM_UP = List.of(
        new WarmUpQuestion("Hello, my name is (examiner's name). What's your full name?", "NAME"),
        new WarmUpQuestion("Where do you live? / Where do you come from?", "HOMETOWN"),
        new WarmUpQuestion("Are you a student?", "STUDENT"),
        new WarmUpQuestion("Do you enjoy your study?", "STUDENT"),
        new WarmUpQuestion("Do you work?", "WORK"),
        new WarmUpQuestion("Do you enjoy your job?", "WORK"),
        new WarmUpQuestion("Do you enjoy your job / study?", "GENERAL")
    );

    public SpeakingGenerationResponse generateTest(SpeakingGenerationRequest request) {
        SpeakingGenerationResponse response = new SpeakingGenerationResponse();
        SpeakingNewFormatData config = request.getConfig();

        String profile = request.getCandidateProfile() != null
            ? request.getCandidateProfile().toUpperCase() : "STUDENT";

        // 1. Warm-up (filtered by profile)
        if (config != null && Boolean.TRUE.equals(config.getIncludeWarmUp())) {
            List<WarmUpQuestion> source = config.getWarmUpQuestions() != null
                && !config.getWarmUpQuestions().isEmpty()
                ? config.getWarmUpQuestions() : DEFAULT_WARM_UP;

            List<WarmUpQuestion> filtered = source.stream()
                .filter(q -> {
                    String type = q.getType() != null ? q.getType().toUpperCase() : "";
                    if (type.equals("NAME") || type.equals("HOMETOWN") || type.equals("GENERAL")) return true;
                    if (type.equals("STUDENT_WORK")) return true;
                    if (type.equals("STUDENT")) return "STUDENT".equals(profile);
                    if (type.equals("WORK")) return "WORK".equals(profile);
                    return true;
                })
                .collect(Collectors.toList());
            response.setWarmUpQuestions(filtered);
        }

        if (config != null) {
            generateInline(response, config, profile);
        }

        // 4. Create snapshot if attemptId provided
        if (request.getAttemptId() != null) {
            createSnapshot(request.getAttemptId(), response);
        }

        return response;
    }

    // === INLINE mode ===
    private void generateInline(SpeakingGenerationResponse response, SpeakingNewFormatData config, String profile) {
        List<SpeakingFrame> part1Frames = new ArrayList<>();

        // Mandatory frames
        List<InlineFrame> mandatoryFrames = new ArrayList<>();
        if (config.getFrames() != null) {
            for (InlineFrame f : config.getFrames()) {
                if (!"MANDATORY".equalsIgnoreCase(f.getFrameType())) continue;
                String name = f.getName() != null ? f.getName().toUpperCase() : "";
                boolean isHomeOrTown = name.equals("HOME") || name.equals("HOMETOWN");
                boolean isStudy = name.equals("STUDY") && "STUDENT".equals(profile);
                boolean isWork = name.equals("WORK") && "WORK".equals(profile);
                boolean isBoth = f.getProfile() != null && "BOTH".equalsIgnoreCase(f.getProfile());
                if (isHomeOrTown || isStudy || isWork || isBoth) {
                    mandatoryFrames.add(f);
                }
            }
        }

        if (!mandatoryFrames.isEmpty()) {
            InlineFrame selected = mandatoryFrames.get(random.nextInt(mandatoryFrames.size()));
            int count = Math.max(1, intVal(config.getMandatoryQuestionCount(), 5));
            part1Frames.add(toSpeakingFrame(selected, count));
        }

        // Optional frames
        List<InlineFrame> optionalFrames = new ArrayList<>();
        if (config.getFrames() != null) {
            for (InlineFrame f : config.getFrames()) {
                if ("OPTIONAL".equalsIgnoreCase(f.getFrameType())) {
                    optionalFrames.add(f);
                }
            }
        }

        Collections.shuffle(optionalFrames, random);
        int optFrameCount = Math.min(intVal(config.getOptionalFrameCount(), 2), optionalFrames.size());
        for (int i = 0; i < optFrameCount; i++) {
            InlineFrame f = optionalFrames.get(i);
            int count = Math.max(1, intVal(config.getOptionalQuestionCount(), 4));
            part1Frames.add(toSpeakingFrame(f, count));
        }
        response.setPart1Frames(part1Frames);

        // Combo
        if (config.getCombo() != null) {
            InlineCombo ic = config.getCombo();
            if (ic.getBulletPoints() != null || ic.getCueCardPrompt() != null || 
                ic.getPart3Questions() != null || ic.getFollowUpQuestions() != null) {
                SpeakingCombo combo = new SpeakingCombo();
                combo.setTitle(ic.getTitle() != null ? ic.getTitle() : "Inline Combo");
                combo.setCueCardPrompt(ic.getCueCardPrompt() != null ? ic.getCueCardPrompt() : "");
                if (ic.getBulletPoints() != null) {
                    combo.setBulletPoints(new ArrayList<>(pickFromList(ic.getBulletPoints(), ic.getBulletPoints().size())));
                }
                if (ic.getFollowUpQuestions() != null) {
                    int followUpCount = ic.getRandomFollowUpCount() != null && ic.getRandomFollowUpCount() > 0 ? ic.getRandomFollowUpCount() : 3;
                    combo.setFollowUpQuestions(pickFromList(ic.getFollowUpQuestions(), followUpCount));
                }
                if (ic.getPart3Questions() != null) {
                    int p3Count = Math.max(1, intVal(config.getPart3QuestionCount(), 5));
                    combo.setPart3Questions(pickFromList(ic.getPart3Questions(), p3Count));
                }
                response.setCombo(combo);
            }
        }
    }

    // === Snapshot ===
    private void createSnapshot(Long attemptId, SpeakingGenerationResponse response) {
        snapshotRepository.deleteBySpeakingAttemptId(attemptId);
        List<SpeakingGeneratedQuestion> snapshots = new ArrayList<>();

        // Part 1
        if (response.getPart1Frames() != null) {
            for (SpeakingFrame frame : response.getPart1Frames()) {
                List<String> questions = frame.getQuestions();
                if (questions == null) continue;
                for (int i = 0; i < questions.size(); i++) {
                    SpeakingGeneratedQuestion q = new SpeakingGeneratedQuestion();
                    q.setSpeakingAttemptId(attemptId);
                    q.setPart("PART1");
                    q.setQuestionIndex(i + 1);
                    q.setQuestionText(questions.get(i));
                    q.setFrameName(frame.getName());
                    snapshots.add(q);
                }
            }
        }

        // Combo (Part 2 + 3)
        if (response.getCombo() != null) {
            SpeakingCombo combo = response.getCombo();

            // Part 2 questions
            if (combo.getBulletPoints() != null) {
                for (int i = 0; i < combo.getBulletPoints().size(); i++) {
                    SpeakingGeneratedQuestion q = new SpeakingGeneratedQuestion();
                    q.setSpeakingAttemptId(attemptId);
                    q.setPart("PART2");
                    q.setQuestionIndex(i + 1);
                    q.setQuestionText(combo.getBulletPoints().get(i));
                    q.setComboTitle(combo.getTitle());
                    snapshots.add(q);
                }
            }
            if (combo.getFollowUpQuestions() != null) {
                for (int i = 0; i < combo.getFollowUpQuestions().size(); i++) {
                    SpeakingGeneratedQuestion q = new SpeakingGeneratedQuestion();
                    q.setSpeakingAttemptId(attemptId);
                    q.setPart("PART2");
                    q.setQuestionIndex(combo.getBulletPoints().size() + i + 1);
                    q.setQuestionText(combo.getFollowUpQuestions().get(i));
                    q.setComboTitle(combo.getTitle());
                    snapshots.add(q);
                }
            }

            // Part 3
            if (combo.getPart3Questions() != null) {
                for (int i = 0; i < combo.getPart3Questions().size(); i++) {
                    SpeakingGeneratedQuestion q = new SpeakingGeneratedQuestion();
                    q.setSpeakingAttemptId(attemptId);
                    q.setPart("PART3");
                    q.setQuestionIndex(i + 1);
                    q.setQuestionText(combo.getPart3Questions().get(i));
                    q.setComboTitle(combo.getTitle());
                    snapshots.add(q);
                }
            }
        }

        if (!snapshots.isEmpty()) {
            snapshotRepository.saveAll(snapshots);
        }
    }

    // === Helpers ===

    private static int intVal(Integer value, int fallback) {
        return value != null ? value : fallback;
    }

    private SpeakingFrame toSpeakingFrame(InlineFrame f, int count) {
        SpeakingFrame frame = new SpeakingFrame();
        frame.setName(f.getName() != null ? f.getName() : "");
        frame.setFrameType(f.getFrameType() != null ? f.getFrameType() : "OPTIONAL");
        frame.setQuestions(pickFromList(f.getQuestions(), count));
        return frame;
    }

    private List<String> pickFromList(List<String> list, int count) {
        if (list == null || list.isEmpty()) return new ArrayList<>();
        List<String> copy = new ArrayList<>(list);
        Collections.shuffle(copy, random);
        int actual = Math.min(count, copy.size());
        return copy.subList(0, actual);
    }
}
