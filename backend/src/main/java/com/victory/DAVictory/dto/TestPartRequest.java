package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class TestPartRequest {
    private Long partId;            // ID của part gốc (Part 1/Part 2... của session)
    private Integer orderIndex;     // Thứ tự trong session (mặc định theo part gốc)
    private Boolean isIncluded;     // Bật/tắt part này (mặc định true)
    private Integer questionCount;  // Số câu hỏi thực tế (null = tất cả)
    private Integer durationMinutes; // Ghi đè thời gian (null = dùng mặc định)
}
