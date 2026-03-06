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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/writing")
@RequiredArgsConstructor
@Tag(name = "Writing", description = "API quản lý Writing (Task 1 & Task 2)")
public class WritingController {

    private final WritingPromptRepository writingPromptRepository;
    private final StudentWritingSubmissionRepository submissionRepository;
    private final WritingScoreRepository scoreRepository;
    private final WritingTaskRepository writingTaskRepository;
    private final UserRepository userRepository;

    // ===== QUẢN LÝ ĐỀ WRITING =====

    @GetMapping("/prompts")
    @Operation(summary = "Lấy tất cả đề Writing", description = "Danh sách Writing prompts (Task 1 & 2)")
    public ResponseEntity<List<WritingPrompt>> getAllPrompts() {
        return ResponseEntity.ok(writingPromptRepository.findAll());
    }

    @GetMapping("/prompts/{id}")
    @Operation(summary = "Lấy chi tiết 1 đề Writing", description = "Nội dung đề bài, yêu cầu, sample answer")
    public ResponseEntity<WritingPrompt> getPromptById(@PathVariable Long id) {
        return writingPromptRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/prompts/task/{taskId}")
    @Operation(summary = "Lấy đề Writing theo writing task", description = "Filter theo writing_task_id")
    public ResponseEntity<List<WritingPrompt>> getPromptsByTask(@PathVariable Long taskId) {
        return ResponseEntity.ok(
            writingPromptRepository.findByWritingTaskIdAndIsActiveTrueOrderByOrderIndexAsc(taskId));
    }

    @PostMapping("/prompts")
    @Operation(summary = "Tạo đề Writing mới", description = "Teacher tạo Writing prompt")
    public ResponseEntity<WritingPrompt> createPrompt(@RequestBody WritingPrompt prompt) {
        return ResponseEntity.ok(writingPromptRepository.save(prompt));
    }

    @PutMapping("/prompts/{id}")
    @Operation(summary = "Cập nhật đề Writing", description = "Sửa nội dung đề bài")
    public ResponseEntity<WritingPrompt> updatePrompt(
            @PathVariable Long id,
            @RequestBody WritingPrompt prompt) {

        if (!writingPromptRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        prompt.setId(id);
        return ResponseEntity.ok(writingPromptRepository.save(prompt));
    }

    // ===== HỌC VIÊN NỘP BÀI =====

    @PostMapping("/submissions")
    @Operation(summary = "Nộp bài Writing", description = "Student gửi bài viết của mình")
    public ResponseEntity<StudentWritingSubmission> submitWriting(@RequestBody SubmitWritingRequest request) {
        return writingPromptRepository.findById(request.getPromptId())
            .flatMap(prompt -> userRepository.findById(request.getStudentId())
                .map(student -> {
                    StudentWritingSubmission submission = new StudentWritingSubmission();
                    submission.setWritingPrompt(prompt);
                    submission.setUser(student);
                    submission.setSubmissionText(request.getContent());
                    submission.setWordCount(countWords(request.getContent()));
                    submission.setSubmittedAt(LocalDateTime.now());
                    submission.setStatus("SUBMITTED"); // Chờ giáo viên chấm
                    submission.setAttemptNumber(
                        submissionRepository.getNextAttemptNumber(student.getId(), prompt.getId()));

                    return ResponseEntity.ok(submissionRepository.save(submission));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/submissions/{id}")
    @Operation(summary = "Xem chi tiết bài nộp", description = "Nội dung + điểm + feedback")
    public ResponseEntity<StudentWritingSubmission> getSubmission(@PathVariable Long id) {
        return submissionRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/submissions/student/{studentId}")
    @Operation(summary = "Lấy bài Writing của học viên", description = "Lịch sử nộp bài của 1 học viên")
    public ResponseEntity<List<StudentWritingSubmission>> getStudentSubmissions(@PathVariable Long studentId) {
        return ResponseEntity.ok(submissionRepository.findByUserIdOrderBySubmittedAtDesc(studentId));
    }

    @GetMapping("/submissions/prompt/{promptId}")
    @Operation(summary = "Lấy bài nộp theo đề", description = "Tất cả bài viết cho 1 đề Writing")
    public ResponseEntity<List<StudentWritingSubmission>> getPromptSubmissions(@PathVariable Long promptId) {
        return ResponseEntity.ok(
            submissionRepository.findByUserIdAndWritingPromptIdOrderByAttemptNumberDesc(null, promptId));
    }

    @GetMapping("/submissions/status/{status}")
    @Operation(summary = "Lấy bài nộp theo trạng thái", description = "Filter: SUBMITTED, UNDER_REVIEW, GRADED")
    public ResponseEntity<List<StudentWritingSubmission>> getSubmissionsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(submissionRepository.findByStatusOrderBySubmittedAtAsc(status));
    }

    // ===== GIÁO VIÊN CHẤM BÀI =====

    @PostMapping("/submissions/{submissionId}/score")
    @Operation(summary = "Giáo viên chấm bài Writing (tổng điểm)", description = "Cập nhật band score tổng và feedback")
    public ResponseEntity<StudentWritingSubmission> scoreWriting(
            @PathVariable Long submissionId,
            @RequestBody ScoreWritingRequest request) {

        return submissionRepository.findById(submissionId)
            .flatMap(submission -> userRepository.findById(request.getTeacherId())
                .map(teacher -> {
                    // Tính band tổng (trung bình 4 tiêu chí)
                    double avgScore = (request.getTaskAchievement()
                                     + request.getCoherenceCohesion()
                                     + request.getLexicalResource()
                                     + request.getGrammarAccuracy()) / 4.0;

                    // Cập nhật trạng thái submission
                    submission.setStatus("GRADED");
                    submission.setOverallBandScore(avgScore);
                    submission.setOverallFeedback(request.getFeedback());
                    submission.setGradedBy(teacher);
                    submission.setGradedAt(LocalDateTime.now());

                    return ResponseEntity.ok(submissionRepository.save(submission));
                }))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/submissions/{submissionId}/scores")
    @Operation(summary = "Xem điểm Writing (theo tiêu chí)", description = "Điểm từng tiêu chí IELTS")
    public ResponseEntity<List<WritingScore>> getWritingScores(@PathVariable Long submissionId) {
        return ResponseEntity.ok(scoreRepository.findBySubmissionId(submissionId));
    }

    // ===== HELPER METHODS =====

    private Integer countWords(String content) {
        if (content == null || content.trim().isEmpty()) {
            return 0;
        }
        return content.trim().split("\\s+").length;
    }

    // ===== DTOs =====

    @Data
    public static class SubmitWritingRequest {
        private Long promptId;
        private Long studentId;
        private String content;
    }

    @Data
    public static class ScoreWritingRequest {
        private Long teacherId;
        private Double taskAchievement;
        private Double coherenceCohesion;
        private Double lexicalResource;
        private Double grammarAccuracy;
        private String feedback;
    }
}
