package com.victory.DAVictory.dto;

import com.victory.DAVictory.enums.TestType;
import lombok.Data;

@Data
public class TestRequest {
    private String title;
    private String description;
    private TestType testType;       // ACADEMIC, GENERAL
    private Boolean isFullTest;      // true = 4 kỹ năng, false = luyện riêng
    private Integer durationMinutes;
    private String targetBand;       // "6.0", "7.0"
}
