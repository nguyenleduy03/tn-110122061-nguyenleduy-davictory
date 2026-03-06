package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.QuestionType;
import com.victory.DAVictory.repository.QuestionTypeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/question-types")
@RequiredArgsConstructor
@Tag(name = "Question Types", description = "API quản lý loại câu hỏi IELTS")
public class QuestionTypeController {

    private final QuestionTypeRepository questionTypeRepository;

    @GetMapping
    @Operation(summary = "Lấy tất cả loại câu hỏi", description = "Danh sách: multiple_choice, true_false_not_given, matching, etc.")
    public ResponseEntity<List<QuestionType>> getAllQuestionTypes() {
        return ResponseEntity.ok(questionTypeRepository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin 1 loại câu hỏi", description = "Chi tiết loại câu hỏi theo ID")
    public ResponseEntity<QuestionType> getQuestionTypeById(@PathVariable Long id) {
        return questionTypeRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Lấy loại câu hỏi theo code", description = "Ví dụ: multiple_choice, matching")
    public ResponseEntity<QuestionType> getQuestionTypeByCode(@PathVariable String code) {
        return questionTypeRepository.findByCode(code)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Tạo loại câu hỏi mới", description = "Admin tạo loại câu hỏi mới (ít dùng)")
    public ResponseEntity<QuestionType> createQuestionType(@RequestBody QuestionType questionType) {
        QuestionType saved = questionTypeRepository.save(questionType);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật loại câu hỏi", description = "Sửa thông tin loại câu hỏi")
    public ResponseEntity<QuestionType> updateQuestionType(
            @PathVariable Long id,
            @RequestBody QuestionType questionType) {
        
        if (!questionTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        questionType.setId(id);
        QuestionType updated = questionTypeRepository.save(questionType);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa loại câu hỏi", description = "Xóa loại câu hỏi (cẩn thận: ảnh hưởng câu hỏi liên quan)")
    public ResponseEntity<Void> deleteQuestionType(@PathVariable Long id) {
        if (!questionTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        questionTypeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
