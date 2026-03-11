package com.victory.DAVictory.config;

import com.victory.DAVictory.service.QuestionBankService;
import com.victory.DAVictory.service.TestStructureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Khởi tạo dữ liệu master (cấu trúc đề IELTS) sau khi roles & users đã tạo.
 * Chạy một lần duy nhất, idempotent (check trước khi insert).
 *
 * Thứ tự chạy:
 *   1. DataInitializer       — Roles + Users
 *   2. TestStructureInitializer — DifficultyLevel + Sessions + Parts + QuestionTypes
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class TestStructureInitializer implements CommandLineRunner {

    private final TestStructureService testStructureService;
    private final QuestionBankService questionBankService;

    @Override
    public void run(String... args) {
        log.info("🔧 [TestStructureInitializer] Bắt đầu khởi tạo cấu trúc IELTS...");

        testStructureService.initializeDifficultyLevels();
        log.info("  ✅ DifficultyLevels (5 cấp độ)");

        testStructureService.initializeSessions();
        log.info("  ✅ Sessions (Listening / Reading / Writing / Speaking × Academic & General)");

        testStructureService.initializeParts();
        log.info("  ✅ Parts (các phần trong mỗi kỹ năng)");

        questionBankService.initializeDefaultQuestionTypes();
        log.info("  ✅ QuestionTypes (14 loại câu hỏi IELTS)");

        log.info("✅ [TestStructureInitializer] Hoàn tất khởi tạo cấu trúc IELTS.");
    }
}
