package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.QuestionGroup;
import com.victory.DAVictory.repository.QuestionGroupRepository;
import com.victory.DAVictory.repository.PartRepository;
import com.victory.DAVictory.repository.SessionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/question-groups")
@RequiredArgsConstructor
@Tag(name = "Question Groups", description = "API quản lý nhóm câu hỏi (passage/audio/bài đọc)")
public class QuestionGroupController {

    private final QuestionGroupRepository questionGroupRepository;
    private final SessionRepository sessionRepository;
    private final PartRepository partRepository;

    @GetMapping
    @Operation(summary = "Lấy tất cả nhóm câu hỏi", description = "Danh sách toàn bộ question groups")
    public ResponseEntity<List<QuestionGroup>> getAllQuestionGroups() {
        return ResponseEntity.ok(questionGroupRepository.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết 1 nhóm câu hỏi", description = "Bao gồm passage/audio và danh sách câu hỏi")
    public ResponseEntity<QuestionGroup> getQuestionGroupById(@PathVariable Long id) {
        return questionGroupRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/part/{partId}")
    @Operation(summary = "Lấy nhóm câu hỏi theo part", description = "Ví dụ: tất cả passages của Reading Part 1")
    public ResponseEntity<List<QuestionGroup>> getQuestionGroupsByPart(@PathVariable Long partId) {
        if (!partRepository.existsById(partId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(questionGroupRepository.findByPartIdOrderByOrderIndexAsc(partId));
    }

    @GetMapping("/part/{partId}/active")
    @Operation(summary = "Lấy nhóm câu hỏi active theo part", description = "Chỉ lấy các group đang hoạt động")
    public ResponseEntity<List<QuestionGroup>> getActiveQuestionGroupsByPart(@PathVariable Long partId) {
        if (!partRepository.existsById(partId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(questionGroupRepository.findByPartIdAndIsActiveTrueOrderByOrderIndexAsc(partId));
    }

    @PostMapping
    @Operation(summary = "Tạo nhóm câu hỏi mới", description = "Teacher tạo passage/audio mới")
    public ResponseEntity<QuestionGroup> createQuestionGroup(@RequestBody QuestionGroup questionGroup) {
        return ResponseEntity.ok(questionGroupRepository.save(questionGroup));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật nhóm câu hỏi", description = "Sửa passage, audio, độ khó, etc.")
    public ResponseEntity<QuestionGroup> updateQuestionGroup(
            @PathVariable Long id,
            @RequestBody QuestionGroup questionGroup) {

        if (!questionGroupRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        questionGroup.setId(id);
        return ResponseEntity.ok(questionGroupRepository.save(questionGroup));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa nhóm câu hỏi", description = "Xóa passage và tất cả câu hỏi con (cẩn thận!)")
    public ResponseEntity<Void> deleteQuestionGroup(@PathVariable Long id) {
        if (!questionGroupRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        questionGroupRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
