package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.TestType;
import lombok.Data;

/**
 * DTO yêu cầu trộn đề thi.
 * Hệ thống sẽ lấy ngẫu nhiên từng Part từ các đề thi PUBLISHED
 * cùng loại (ACADEMIC/GENERAL), cùng kỹ năng, cùng thứ tự Part.
 * Ví dụ: Listening Part 1 chỉ trộn với Listening Part 1 từ đề khác.
 */
@Data
public class ShuffleTestRequest {

    private String title;             // Tên đề mới
    private String description;       // Mô tả
    private TestType testType;        // ACADEMIC hoặc GENERAL
    private Boolean isFullTest;       // true = đủ 4 kỹ năng
    private Long createdByUserId;     // ID người tạo
}
