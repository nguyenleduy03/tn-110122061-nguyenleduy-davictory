package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm AGENT - BLOG POSTS
 * Bảng blog_posts: bài viết blog do Agent tạo (tips, hướng dẫn, tin tức IELTS)
 */
@Entity
@Table(name = "blog_posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(unique = true, length = 500)
    private String slug;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(length = 1000)
    private String thumbnail;

    @Column(length = 500)
    private String tags;

    @Column(length = 500)
    private String metaDescription;

    @Column(nullable = false, length = 20)
    private String status; // draft, published

    private Integer readingTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(nullable = false, length = 20)
    private String source; // agent, manual

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime publishedAt;

    private LocalDateTime deletedAt; // soft delete

    @Column(name = "category_id")
    private Integer categoryId;
}
