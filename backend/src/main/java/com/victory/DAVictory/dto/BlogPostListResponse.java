package com.victory.DAVictory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostListResponse {
    private Long id;
    private String title;
    private String status;
    private String preview;
    private String thumbnail;
    private List<String> tags;
    private Integer readingTime;
    private LocalDateTime createdAt;
    private Integer categoryId;
}
