package com.victory.DAVictory.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FullTestProgressResponse {
    private Long id;
    private Long userId;
    private String username;
    private Long testId;

    private String status;
    private String mode;
    private Integer currentSection;
    private String currentSkill;
    private Integer currentPartIndex;
    private Integer progressPercent;
    private String routePath;
    private String queryString;
    private String sessionStateJson;
    private String snapshotJson;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
