package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.Question;
import com.victory.DAVictory.entity.QuestionOption;
import com.victory.DAVictory.entity.Answer;
import com.victory.DAVictory.repository.QuestionRepository;
import com.victory.DAVictory.repository.QuestionOptionRepository;
import com.victory.DAVictory.repository.AnswerRepository;
import com.victory.DAVictory.repository.QuestionGroupRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
@Tag(name = "Questions", description = "API quản lý câu hỏi IELTS")
public class QuestionController {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final QuestionGroupRepository questionGroupRepository;

    @GetMapping
    @Operation(summary = "Lấy tất cả câu hỏi", description = "Danh sách toàn bộ câu hỏi trong hệ thống")
    public ResponseEntity<List<Question>> getAllQuestions() {
        return ResponseEntity.ok(questionRepository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết 1 câu hỏi", description = "Bao gồm options, answer, explanation")
    public ResponseEntity<Question> getQuestionById(@PathVariable Long id) {
        return questionRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/group/{groupId}")
    @Operation(summary = "Lấy câu hỏi theo nhóm", description = "Tất cả câu hỏi trong 1 passage/audio")
    public ResponseEntity<List<Question>> getQuestionsByGroup(@PathVariable Long groupId) {
        if (!questionGroupRepository.existsById(groupId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(questionRepository.findByQuestionGroupIdOrderByOrderIndexAsc(groupId));
    }

    @GetMapping("/type/{typeId}")
    @Operation(summary = "Lấy câu hỏi theo loại", description = "Ví dụ: tất cả câu multiple_choice")
    public ResponseEntity<List<Question>> getQuestionsByType(@PathVariable Long typeId) {
        return ResponseEntity.ok(questionRepository.findByQuestionTypeIdAndIsActiveTrue(typeId));
    }

    @PostMapping
    @Operation(summary = "Tạo câu hỏi mới", description = "Teacher tạo câu hỏi trong question group")
    public ResponseEntity<Question> createQuestion(@RequestBody Question question) {
        return ResponseEntity.ok(questionRepository.save(question));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật câu hỏi", description = "Sửa nội dung, đáp án, explanation")
    public ResponseEntity<Question> updateQuestion(
            @PathVariable Long id,
            @RequestBody Question question) {

        if (!questionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        question.setId(id);
        return ResponseEntity.ok(questionRepository.save(question));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa câu hỏi", description = "Xóa câu hỏi và các options/answer liên quan")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        if (!questionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        questionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ===== QUẢN LÝ OPTIONS (cho multiple choice) =====

    @GetMapping("/{questionId}/options")
    @Operation(summary = "Lấy danh sách options", description = "Các đáp án A, B, C, D của câu hỏi")
    public ResponseEntity<List<QuestionOption>> getQuestionOptions(@PathVariable Long questionId) {
        if (!questionRepository.existsById(questionId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(questionId));
    }

    @PostMapping("/{questionId}/options")
    @Operation(summary = "Thêm option cho câu hỏi", description = "Tạo đáp án mới (A, B, C, D)")
    public ResponseEntity<QuestionOption> addQuestionOption(
            @PathVariable Long questionId,
            @RequestBody QuestionOption option) {

        return questionRepository.findById(questionId)
            .map(question -> {
                option.setQuestion(question);
                return ResponseEntity.ok(questionOptionRepository.save(option));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/options/{optionId}")
    @Operation(summary = "Xóa option", description = "Xóa 1 đáp án")
    public ResponseEntity<Void> deleteQuestionOption(@PathVariable Long optionId) {
        if (!questionOptionRepository.existsById(optionId)) {
            return ResponseEntity.notFound().build();
        }

        questionOptionRepository.deleteById(optionId);
        return ResponseEntity.noContent().build();
    }

    // ===== QUẢN LÝ ANSWER =====

    @GetMapping("/{questionId}/answers")
    @Operation(summary = "Lấy đáp án đúng", description = "Trả về đáp án chính xác của câu hỏi")
    public ResponseEntity<List<Answer>> getQuestionAnswers(@PathVariable Long questionId) {
        if (!questionRepository.existsById(questionId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(answerRepository.findByQuestionIdOrderByBlankIndexAsc(questionId));
    }

    @PostMapping("/{questionId}/answers")
    @Operation(summary = "Tạo đáp án", description = "Lưu đáp án đúng cho câu hỏi (hỗ trợ nhiều ô trống)")
    public ResponseEntity<Answer> addQuestionAnswer(
            @PathVariable Long questionId,
            @RequestBody Answer answer) {

        return questionRepository.findById(questionId)
            .map(question -> {
                answer.setQuestion(question);
                return ResponseEntity.ok(answerRepository.save(answer));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
