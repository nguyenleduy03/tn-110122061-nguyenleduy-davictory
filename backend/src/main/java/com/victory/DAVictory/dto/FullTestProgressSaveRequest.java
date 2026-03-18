package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class FullTestProgressSaveRequest {
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
}
