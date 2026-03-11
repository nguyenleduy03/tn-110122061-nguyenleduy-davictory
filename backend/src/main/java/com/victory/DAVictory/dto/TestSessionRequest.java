package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class TestSessionRequest {
    private Long sessionId;       // ID của session gốc (Listening/Reading/Writing/Speaking)
    private Integer orderIndex;    // Thứ tự trong đề thi (1, 2, 3, 4)
    private Boolean isIncluded;    // Có bật kỹ năng này không (mặc định true)
    private Integer durationMinutes; // Ghi đè thời gian (null = dùng mặc định)
    private String instructions;    // Ghi đè hướng dẫn (null = dùng mặc định)
}
