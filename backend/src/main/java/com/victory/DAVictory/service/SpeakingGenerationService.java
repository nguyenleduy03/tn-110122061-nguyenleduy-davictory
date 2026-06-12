package com.victory.DAVictory.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.victory.DAVictory.dto.*;
import com.victory.DAVictory.entity.SpeakingCombo;
import com.victory.DAVictory.entity.SpeakingFrame;
import com.victory.DAVictory.repository.SpeakingComboRepository;
import com.victory.DAVictory.repository.SpeakingFrameRepository;
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
    private final ObjectMapper objectMapper;
    private final Random random = new Random();

    private static final List<WarmUpQuestion> DEFAULT_WARM_UP = List.of(
        new WarmUpQuestion("Hello, my name is (examiner's name). What's your full name?", "NAME"),
        new WarmUpQuestion("Where do you live? / Where do you come from?", "HOMETOWN"),
        new WarmUpQuestion("Are you a student or do you have a job?", "STUDENT_WORK"),
        new WarmUpQuestion("Do you enjoy your job / study?", "GENERAL")
    );

    public SpeakingGenerationResponse generateTest(SpeakingGenerationRequest request) {
        SpeakingGenerationResponse response = new SpeakingGenerationResponse();
        SpeakingNewFormatData config = request.getConfig();

        // 1. Part 0: Warm-up
        if (config != null && config.isIncludeWarmUp()) {
            response.setWarmUpQuestions(DEFAULT_WARM_UP);
        }

        String profile = request.getCandidateProfile() != null
            ? request.getCandidateProfile().toUpperCase() : "STUDENT";

        if (config != null && "INLINE".equalsIgnoreCase(config.getMode())) {
            generateInline(response, config, profile);
        } else {
            generateFromBank(response, config, profile);
        }

        return response;
    }

    // === INLINE mode ===
    private void generateInline(SpeakingGenerationResponse response, SpeakingNewFormatData config, String profile) {
        List<SpeakingFrame> part1Frames = new ArrayList<>();

        // 2. Part 1: Mandatory frames
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
            int count = Math.max(1, selected.getRandomCount() > 0 ? selected.getRandomCount() : config.getMandatoryQuestionCount());
            part1Frames.add(toSpeakingFrame(selected, count));
        }

        // 3. Part 1: Optional frames
        List<InlineFrame> optionalFrames = new ArrayList<>();
        if (config.getFrames() != null) {
            for (InlineFrame f : config.getFrames()) {
                if ("OPTIONAL".equalsIgnoreCase(f.getFrameType())) {
                    optionalFrames.add(f);
                }
            }
        }

        Collections.shuffle(optionalFrames, random);
        int optFrameCount = Math.min(config.getOptionalFrameCount(), optionalFrames.size());
        for (int i = 0; i < optFrameCount; i++) {
            InlineFrame f = optionalFrames.get(i);
            int count = Math.max(1, f.getRandomCount() > 0 ? f.getRandomCount() : config.getOptionalQuestionCount());
            part1Frames.add(toSpeakingFrame(f, count));
        }

        response.setPart1Frames(part1Frames);

        // 4. Part 2 + 3: Combo
        if (config.getCombo() != null) {
            InlineCombo ic = config.getCombo();
            SpeakingCombo combo = new SpeakingCombo();
            combo.setTitle(ic.getTitle() != null ? ic.getTitle() : "Inline Combo");
            combo.setCueCardPrompt(ic.getCueCardPrompt() != null ? ic.getCueCardPrompt() : "");
            combo.setBulletPoints(toJsonString(ic.getBulletPoints()));
            int followUpCount = ic.getRandomFollowUpCount() > 0 ? ic.getRandomFollowUpCount() : 3;
            combo.setFollowUpQuestions(pickRandomFromList(ic.getFollowUpQuestions(), followUpCount));
            int p3Count = ic.getPart3RandomCount() > 0 ? ic.getPart3RandomCount() : config.getPart3QuestionCount();
            combo.setPart3Questions(pickRandomFromList(ic.getPart3Questions(), p3Count));
            response.setCombo(combo);
        }
    }

    // === BANK mode ===
    private void generateFromBank(SpeakingGenerationResponse response, SpeakingNewFormatData config, String profile) {
        List<SpeakingFrame> part1Frames = new ArrayList<>();

        // 1. Mandatory
        List<SpeakingFrame> mandatoryFrames = frameRepository.findByFrameTypeAndIsActiveTrue("MANDATORY");
        List<SpeakingFrame> profileSpecificMandatory = new ArrayList<>();

        for (SpeakingFrame frame : mandatoryFrames) {
            String name = frame.getName().toUpperCase();
            if (name.equals("HOME") || name.equals("HOMETOWN")) {
                profileSpecificMandatory.add(frame);
            } else if (profile.equals("STUDENT") && name.equals("STUDY")) {
                profileSpecificMandatory.add(frame);
            } else if (profile.equals("WORK") && name.equals("WORK")) {
                profileSpecificMandatory.add(frame);
            }
        }

        if (!profileSpecificMandatory.isEmpty()) {
            SpeakingFrame selected = profileSpecificMandatory.get(random.nextInt(profileSpecificMandatory.size()));
            int count = config != null ? config.getMandatoryQuestionCount() : 5;
            selected.setQuestions(pickRandomQuestions(selected.getQuestions(), count));
            part1Frames.add(selected);
        }

        // 2. Optional
        if (config != null) {
            List<SpeakingFrame> optionalFramesToUse = new ArrayList<>();
            if (config.isAutoRandomOptionalFrames()) {
                List<SpeakingFrame> allOptional = frameRepository.findByFrameTypeAndIsActiveTrue("OPTIONAL");
                Collections.shuffle(allOptional, random);
                int count = Math.min(config.getOptionalFrameCount(), allOptional.size());
                for (int i = 0; i < count; i++) optionalFramesToUse.add(allOptional.get(i));
            } else if (config.getSelectedOptionalFrameIds() != null) {
                optionalFramesToUse = frameRepository.findAllById(config.getSelectedOptionalFrameIds());
            }

            int optCount = config.getOptionalQuestionCount();
            for (SpeakingFrame frame : optionalFramesToUse) {
                frame.setQuestions(pickRandomQuestions(frame.getQuestions(), optCount));
                part1Frames.add(frame);
            }

            // 3. Combo
            if (config.getSelectedComboId() != null) {
                comboRepository.findById(config.getSelectedComboId()).ifPresent(combo -> {
                    combo.setPart3Questions(pickRandomQuestions(combo.getPart3Questions(), config.getPart3QuestionCount()));
                    response.setCombo(combo);
                });
            }
        }

        response.setPart1Frames(part1Frames);
    }

    // === Helpers ===

    private SpeakingFrame toSpeakingFrame(InlineFrame f, int count) {
        SpeakingFrame frame = new SpeakingFrame();
        frame.setName(f.getName() != null ? f.getName() : "");
        frame.setFrameType(f.getFrameType() != null ? f.getFrameType() : "OPTIONAL");
        List<String> selected = pickFromList(f.getQuestions(), count);
        frame.setQuestions(toJsonString(selected));
        return frame;
    }

    private String pickRandomQuestions(String questionsJson, int count) {
        if (questionsJson == null || questionsJson.isBlank()) return "[]";
        try {
            List<String> all = objectMapper.readValue(questionsJson, new TypeReference<List<String>>() {});
            return toJsonString(pickFromList(all, count));
        } catch (Exception e) {
            return questionsJson;
        }
    }

    private String pickRandomFromList(List<String> list, int count) {
        return toJsonString(pickFromList(list, count));
    }

    private List<String> pickFromList(List<String> list, int count) {
        if (list == null || list.isEmpty()) return new ArrayList<>();
        List<String> copy = new ArrayList<>(list);
        Collections.shuffle(copy, random);
        int actual = Math.min(count, copy.size());
        return copy.subList(0, actual);
    }

    private String toJsonString(List<String> list) {
        if (list == null) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
}
