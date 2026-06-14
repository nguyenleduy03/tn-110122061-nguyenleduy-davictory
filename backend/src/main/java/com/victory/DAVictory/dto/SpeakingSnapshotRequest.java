package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingSnapshotRequest {
    private Long examAttemptId;
    private List<SnapshotQuestion> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SnapshotQuestion {
        private String part;       // PART1, PART2, PART3
        private Integer questionIndex;
        private String questionText;
        private String frameName;
        private String comboTitle;
    }
}
