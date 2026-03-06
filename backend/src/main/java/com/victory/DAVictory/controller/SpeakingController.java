package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.*;
import com.victory.DAVictory.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/speaking")
@RequiredArgsConstructor
@Tag(name = "Speaking", description = "API quản lý Speaking (Part 1, 2, 3)")
public class SpeakingController {

    private final SpeakingTopicRepository topicRepository;
    private final SpeakingCueCardRepository cueCardRepository;
    private final SpeakingAttemptRepository attemptRepository;
    private final SpeakingScoreRepository scoreRepository;
    private final SpeakingFeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    // ===== QUẢN LÝ ĐỀ SPEAKING =====

    @GetMapping("/topics")
    @Operation(summary = "Lấy tất cả chủ đề Speaking", description = "Danh sách Speaking topics (Part 1, 2, 3)")
    public ResponseEntity<List<SpeakingTopic>> getAllTopics() {
        return ResponseEntity.ok(topicRepository.findAll());
    }

    @GetMapping("/topics/{id}")
    @Operation(summary = "Lấy chi tiết chủ đề Speaking", description = "Nội dung câu hỏi, cue card, follow-up questions")
    public ResponseEntity<SpeakingTopic> getTopicById(@PathVariable Long id) {
        return topicRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/cue-cards")
    @Operation(summary = "Lấy tất cả Cue Cards (Part 2)", description = "Danh sách Speaking cue cards")
    public ResponseEntity<List<SpeakingCueCard>> getAllCueCards() {
        return ResponseEntity.ok(cueCardRepository.findAll());
    }

    @PostMapping("/topics")
    @Operation(summary = "Tạo chủ đề Speaking mới", description = "Teacher tạo Speaking topic")
    public ResponseEntity<SpeakingTopic> createTopic(@RequestBody SpeakingTopic topic) {
        return ResponseEntity.ok(topicRepository.save(topic));
    }

    @PutMapping("/topics/{id}")
    @Operation(summary = "Cập nhật chủ đề Speaking", description = "Sửa câu hỏi, cue card")
    public ResponseEntity<SpeakingTopic> updateTopic(
            @PathVariable Long id,
            @RequestBody SpeakingTopic topic) {

        if (!topicRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        topic.setId(id);
        return ResponseEntity.ok(topicRepository.save(topic));
    }

    // ===== HỌC VIÊN LÀM BÀI =====

    @PostMapping("/attempts")
    @Operation(summary = "Bắt đầu Speaking attempt", description = "Student bắt đầu làm bài Speaking")
    public ResponseEntity<SpeakingAttempt> startSpeakingAttempt(@RequestBody StartSpeakingRequest request) {
        return userRepository.findById(request.getStudentId())
            .map(student -> {
                SpeakingAttempt attempt = new SpeakingAttempt();
                attempt.setUser(student);
                attempt.setSpeakingPart(request.getSpeakingPart() != null ? request.getSpeakingPart() : "PART1");
                attempt.setStartedAt(LocalDateTime.now());
                attempt.setStatus("IN_PROGRESS");
                attempt.setAttemptNumber(1);
                attempt.setIsActive(true);

                // Gắn topic nếu có
                if (request.getTopicId() != null) {
                    topicRepository.findById(request.getTopicId())
                        .ifPresent(attempt::setSpeakingTopic);
                }

                // Gắn cue card nếu có
                if (request.getCueCardId() != null) {
                    cueCardRepository.findById(request.getCueCardId())
                        .ifPresent(attempt::setCueCard);
                }

                return ResponseEntity.ok(attemptRepository.save(attempt));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/attempts/{id}")
    @Operation(summary = "Xem chi tiết Speaking attempt", description = "Thông tin bài làm + audio + điểm")
    public ResponseEntity<SpeakingAttempt> getAttempt(@PathVariable Long id) {
        return attemptRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/attempts/student/{studentId}")
    @Operation(summary = "Lịch sử Speaking của học viên", description = "Tất cả bài Speaking đã làm")
    public ResponseEntity<List<SpeakingAttempt>> getStudentAttempts(@PathVariable Long studentId) {
        return ResponseEntity.ok(attemptRepository.findByUserIdOrderByCreatedAtDesc(studentId));
    }

    @GetMapping("/attempts/status/{status}")
    @Operation(summary = "Lấy attempts theo trạng thái", description = "Filter: IN_PROGRESS, SUBMITTED, GRADED")
    public ResponseEntity<List<SpeakingAttempt>> getAttemptsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(attemptRepository.findByStatusOrderByCreatedAtDesc(status));
    }

    // ===== GIÁO VIÊN CHẤM BÀI =====

    @PostMapping("/attempts/{attemptId}/score")
    @Operation(summary = "Giáo viên chấm bài Speaking", description = "Chấm điểm theo 4 tiêu chí IELTS Speaking")
    public ResponseEntity<SpeakingScore> scoreSpeaking(
            @PathVariable Long attemptId,
            @RequestBody ScoreSpeakingRequest request) {

        return attemptRepository.findById(attemptId)
            .flatMap(attempt -> userRepository.findById(request.getTeacherId())
                .map(teacher -> {
                    // Tạo/cập nhật điểm Speaking
                    SpeakingScore score = new SpeakingScore();
                    score.setSpeakingAttempt(attempt);
                    score.setScoredBy(teacher);
                    score.setFluencyCoherence(request.getFluencyCoherence());
                    score.setLexicalResource(request.getLexicalResource());
                    score.setGrammaticalRangeAccuracy(request.getGrammarAccuracy());
                    score.setPronunciation(request.getPronunciation());

                    // Tính band tổng (trung bình 4 tiêu chí)
                    double avgScore = (request.getFluencyCoherence()
                                     + request.getLexicalResource()
                                     + request.getGrammarAccuracy()
                                     + request.getPronunciation()) / 4.0;
                    score.setOverallBandScore(avgScore);
                    score.setScoredAt(LocalDateTime.now());

                    // Cập nhật attempt
                    attempt.setGradedBy(teacher);
                    attempt.setGradedAt(LocalDateTime.now());
                    attempt.setOverallBandScore(avgScore);
                    attempt.setStatus("GRADED");
                    attemptRepository.save(attempt);

                    // Tạo feedback nếu có
                    if (request.getFeedback() != null && !request.getFeedback().isBlank()) {
                        SpeakingFeedback fb = new SpeakingFeedback();
                        fb.setSpeakingAttempt(attempt);
                        fb.setCreatedBy(teacher);
                        fb.setOverallFeedback(request.getFeedback());
                        fb.setFeedbackAt(LocalDateTime.now());
                        fb.setIsRead(false);
                        feedbackRepository.save(fb);
                    }

                    return ResponseEntity.ok(scoreRepository.save(score));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/attempts/{attemptId}/score")
    @Operation(summary = "Xem điểm Speaking", description = "Điểm chi tiết 4 tiêu chí + feedback")
    public ResponseEntity<Map<String, Object>> getSpeakingScore(@PathVariable Long attemptId) {
        return attemptRepository.findById(attemptId)
            .map(attempt -> {
                Map<String, Object> result = new HashMap<>();
                result.put("attemptId", attempt.getId());
                result.put("status", attempt.getStatus());
                result.put("overallBandScore", attempt.getOverallBandScore() != null ? attempt.getOverallBandScore() : 0);

                // Lấy điểm từ SpeakingScore nếu có
                if (attempt.getScore() != null) {
                    SpeakingScore s = attempt.getScore();
                    result.put("fluencyCoherence", s.getFluencyCoherence() != null ? s.getFluencyCoherence() : 0);
                    result.put("lexicalResource", s.getLexicalResource() != null ? s.getLexicalResource() : 0);
                    result.put("grammarAccuracy", s.getGrammaticalRangeAccuracy() != null ? s.getGrammaticalRangeAccuracy() : 0);
                    result.put("pronunciation", s.getPronunciation() != null ? s.getPronunciation() : 0);
                    result.put("scoredAt", s.getScoredAt());
                }

                // Lấy feedback nếu có
                if (attempt.getFeedback() != null) {
                    result.put("feedback", attempt.getFeedback().getOverallFeedback());
                }

                return ResponseEntity.ok(result);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ===== DTOs =====

    @Data
    public static class StartSpeakingRequest {
        private Long studentId;
        private Long topicId;
        private Long cueCardId;
        private String speakingPart; // PART1, PART2, PART3, FULL
    }

    @Data
    public static class ScoreSpeakingRequest {
        private Long teacherId;
        private Double fluencyCoherence;
        private Double lexicalResource;
        private Double grammarAccuracy;
        private Double pronunciation;
        private String feedback;
    }
}
