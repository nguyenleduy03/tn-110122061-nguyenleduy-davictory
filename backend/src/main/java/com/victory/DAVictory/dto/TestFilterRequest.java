package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestStatus;
import com.victory.DAVictory.enums.TestType;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO cho filter và search đề thi
 */
@Data
public class TestFilterRequest {
    
    // Search
    private String search; // Tìm theo title
    
    // Basic filters
    private TestType testType; // ACADEMIC, GENERAL
    private TestStatus status; // DRAFT, PUBLISHED, ARCHIVED...
    private Boolean isFullTest; // true = Full Test, false = Single Skill
    private SkillType skillType; // LISTENING, READING, WRITING, SPEAKING
    
    // Advanced filters
    private String targetBand; // "6.0", "6.5", "7.0"...
    private Integer minDuration; // Thời gian tối thiểu (phút)
    private Integer maxDuration; // Thời gian tối đa (phút)
    private Long createdById; // ID giáo viên tạo
    
    // Date range
    private LocalDateTime createdFrom;
    private LocalDateTime createdTo;
    
    // Sorting
    private String sortBy; // createdAt, attemptCount, averageScore, title
    private String sortOrder; // ASC, DESC
    
    // Pagination
    private Integer page; // 0-based
    private Integer size; // Số item mỗi trang
}
