package com.victory.DAVictory.dto;

import lombok.Data;

/**
 * Request DTO: học viên nộp bài writing.
 * Dùng cho POST /api/writing/submit
 */
@Data
public class WritingSubmitRequest {

    private Long testId;           // ID đề thi (tùy chọn, để lưu context)
    private Long questionGroupId;  // ID question_group chứa đề bài writing
    private String submissionText; // Nội dung bài viết
    private Integer wordCount;     // Số từ (tính sẵn ở frontend)
    private Integer timeTakenSeconds; // Thời gian làm bài (giây, tùy chọn)
}
