package com.victory.DAVictory.dto;

import lombok.Data;

@Data
public class TestQuestionGroupRequest {
    private Long questionGroupId;         // ID group từ ngân hàng (nếu thêm group có sẵn)
    private Integer orderIndex;
    private Integer questionFrom;         // Số câu bắt đầu trong đề (1, 11, 21...)
    private Integer questionTo;           // Số câu kết thúc (10, 20, 30...)
    private Boolean isRandomOrder;        // Xáo trộn câu hỏi khi thi
    private String customTitle;           // Override tiêu đề
    private String customInstructions;    // Override hướng dẫn
}
