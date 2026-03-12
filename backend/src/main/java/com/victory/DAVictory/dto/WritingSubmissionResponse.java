package com.victory.DAVictory.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * Response DTO: kết quả sau khi nộp / xem bài writing.
 */
@Data
public class WritingSubmissionResponse {

    private Long id;
    private Long userId;
    private String username;

    private Long questionGroupId;    // ID question_group (TestBuilder flow)
    private String groupTitle;       // Tiêu đề nhóm (e.g. "Writing Task 1")

    private String submissionText;
    private Integer wordCount;
    private Integer timeTakenSeconds;

    private String status;           // SUBMITTED, UNDER_REVIEW, GRADED
    private LocalDateTime submittedAt;

    private Double overallBandScore; // null nếu chưa chấm
    private String overallFeedback;  // null nếu chưa chấm
    private String gradedByUsername; // null nếu chưa chấm

    private Integer attemptNumber;
    private LocalDateTime createdAt;
}
