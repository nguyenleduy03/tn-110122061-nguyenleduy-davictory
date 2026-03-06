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
@RequestMapping("/api/exam-attempts")
@RequiredArgsConstructor
@Tag(name = "Exam Attempts", description = "API làm bài thi và nộp bài")
public class ExamAttemptController {

    private final ExamAttemptRepository examAttemptRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final QuestionOptionRepository questionOptionRepository;

    // ===== BẮT ĐẦU BÀI THI =====

    @PostMapping("/start")
    @Operation(summary = "Bắt đầu làm bài thi", description = "Student bắt đầu 1 lượt thi mới")
    public ResponseEntity<ExamAttempt> startExamAttempt(@RequestBody StartExamRequest request) {
        return sessionRepository.findById(request.getSessionId())
            .flatMap(session -> userRepository.findById(request.getStudentId())
                .map(student -> {
                    ExamAttempt attempt = new ExamAttempt();
                    attempt.setSession(session);
                    attempt.setUser(student);
                    attempt.setStartedAt(LocalDateTime.now());
                    attempt.setStatus("IN_PROGRESS");
                    attempt.setAttemptNumber(
                        examAttemptRepository.getNextAttemptNumber(student.getId(), session.getId()));
                    attempt.setIsActive(true);

                    return ResponseEntity.ok(examAttemptRepository.save(attempt));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin lượt thi", description = "Chi tiết exam attempt + các câu trả lời")
    public ResponseEntity<ExamAttempt> getExamAttempt(@PathVariable Long id) {
        return examAttemptRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Lấy lịch sử thi của học viên", description = "Tất cả lượt thi của 1 học viên")
    public ResponseEntity<List<ExamAttempt>> getStudentAttempts(@PathVariable Long studentId) {
        return ResponseEntity.ok(examAttemptRepository.findByUserIdOrderByCreatedAtDesc(studentId));
    }

    @GetMapping("/session/{sessionId}")
    @Operation(summary = "Lấy lượt thi theo session", description = "Tất cả lượt thi của 1 session")
    public ResponseEntity<List<ExamAttempt>> getSessionAttempts(@PathVariable Long sessionId) {
        return ResponseEntity.ok(examAttemptRepository.findByStatusOrderByCreatedAtDesc("GRADED"));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Lấy lượt thi theo trạng thái", description = "Filter: IN_PROGRESS, SUBMITTED, GRADED")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(examAttemptRepository.findByStatusOrderByCreatedAtDesc(status));
    }

    // ===== TRẢ LỜI CÂU HỎI =====

    @PostMapping("/{attemptId}/answer")
    @Operation(summary = "Trả lời câu hỏi", description = "Student submit câu trả lời cho 1 câu hỏi")
    public ResponseEntity<AttemptAnswer> answerQuestion(
            @PathVariable Long attemptId,
            @RequestBody AnswerQuestionRequest request) {

        return examAttemptRepository.findById(attemptId)
            .flatMap(attempt -> questionRepository.findById(request.getQuestionId())
                .map(question -> {
                    // Tìm hoặc tạo mới AttemptAnswer
                    AttemptAnswer attemptAnswer = attemptAnswerRepository
                        .findByExamAttemptIdAndQuestionId(attempt.getId(), question.getId())
                        .orElse(new AttemptAnswer());

                    attemptAnswer.setExamAttempt(attempt);
                    attemptAnswer.setQuestion(question);
                    attemptAnswer.setTextAnswer(request.getStudentAnswer());
                    attemptAnswer.setIsAnswered(true);
                    attemptAnswer.setAnsweredAt(LocalDateTime.now());

                    // Chấm điểm tự động cho MCQ (dựa vào QuestionOption)
                    List<QuestionOption> correctOptions =
                        questionOptionRepository.findByQuestionIdAndIsCorrectTrue(question.getId());
                    if (!correctOptions.isEmpty()) {
                        boolean isCorrect = correctOptions.stream()
                            .anyMatch(opt -> opt.getOptionLabel() != null &&
                                opt.getOptionLabel().equalsIgnoreCase(request.getStudentAnswer()));
                        attemptAnswer.setIsCorrect(isCorrect);
                        attemptAnswer.setPointsEarned(isCorrect ? question.getPoints() : 0.0);
                    }

                    return ResponseEntity.ok(attemptAnswerRepository.save(attemptAnswer));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{attemptId}/answers")
    @Operation(summary = "Lấy tất cả câu trả lời", description = "Danh sách câu trả lời của học viên trong lượt thi")
    public ResponseEntity<List<AttemptAnswer>> getAttemptAnswers(@PathVariable Long attemptId) {
        if (!examAttemptRepository.existsById(attemptId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(attemptAnswerRepository.findByExamAttemptId(attemptId));
    }

    // ===== NỘP BÀI =====

    @PostMapping("/{attemptId}/submit")
    @Operation(summary = "Nộp bài thi", description = "Student hoàn thành và nộp bài → tính điểm")
    public ResponseEntity<Map<String, Object>> submitExamAttempt(@PathVariable Long attemptId) {
        return examAttemptRepository.findById(attemptId)
            .map(attempt -> {
                attempt.setSubmittedAt(LocalDateTime.now());
                attempt.setStatus("SUBMITTED");

                // Tính tổng điểm
                List<AttemptAnswer> answers = attemptAnswerRepository.findByExamAttemptId(attemptId);
                long correctCount = answers.stream()
                    .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                    .count();

                double totalScore = answers.stream()
                    .filter(a -> a.getPointsEarned() != null)
                    .mapToDouble(AttemptAnswer::getPointsEarned)
                    .sum();

                attempt.setRawScore(totalScore);
                attempt.setTotalCorrect((int) correctCount);
                attempt.setTotalAnswered((int) answers.stream().filter(a -> Boolean.TRUE.equals(a.getIsAnswered())).count());

                // Tính band score (simplified)
                double bandScore = Math.min(9.0, totalScore / 10.0);
                attempt.setBandScore(bandScore);

                examAttemptRepository.save(attempt);

                Map<String, Object> result = new HashMap<>();
                result.put("message", "Exam submitted successfully");
                result.put("totalScore", totalScore);
                result.put("bandScore", bandScore);
                result.put("correctAnswers", correctCount);
                result.put("totalQuestions", answers.size());
                return ResponseEntity.ok(result);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ===== XEM KẾT QUẢ =====

    @GetMapping("/{attemptId}/result")
    @Operation(summary = "Xem kết quả bài thi", description = "Điểm số, band, đáp án đúng/sai")
    public ResponseEntity<Map<String, Object>> getExamResult(@PathVariable Long attemptId) {
        return examAttemptRepository.findById(attemptId)
            .map(attempt -> {
                List<AttemptAnswer> answers = attemptAnswerRepository.findByExamAttemptId(attemptId);

                long correctCount = answers.stream()
                    .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                    .count();

                long wrongCount = answers.stream()
                    .filter(a -> Boolean.FALSE.equals(a.getIsCorrect()))
                    .count();

                Map<String, Object> result = new HashMap<>();
                result.put("attempt", attempt);
                result.put("rawScore", attempt.getRawScore());
                result.put("bandScore", attempt.getBandScore());
                result.put("correctAnswers", correctCount);
                result.put("wrongAnswers", wrongCount);
                result.put("totalQuestions", answers.size());
                return ResponseEntity.ok(result);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ===== DTOs =====

    @Data
    public static class StartExamRequest {
        private Long sessionId;
        private Long studentId;
    }

    @Data
    public static class AnswerQuestionRequest {
        private Long questionId;
        private String studentAnswer;
    }
}
