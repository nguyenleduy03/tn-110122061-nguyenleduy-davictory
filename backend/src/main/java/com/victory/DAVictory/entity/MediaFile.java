package com.victory.DAVictory.entity;

import com.victory.DAVictory.enums.MediaType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String filePath; // Đường dẫn lưu trữ trên server hoặc cloud

    @Column(length = 500)
    private String fileUrl; // URL public để truy cập file (CDN/S3/local)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaType mediaType; // AUDIO, IMAGE, VIDEO, DOCUMENT

    @Column(length = 50)
    private String mimeType; // audio/mpeg, image/png, video/mp4...

    @Column
    private Long fileSize; // Kích thước file tính bằng bytes

    @Column(length = 20)
    private String duration; // Thời lượng (chỉ dành cho AUDIO/VIDEO): "00:03:45"

    @Column
    private Integer width; // Chiều rộng (chỉ dành cho IMAGE/VIDEO, tính bằng px)

    @Column
    private Integer height; // Chiều cao (chỉ dành cho IMAGE/VIDEO, tính bằng px)

    @Column(length = 100)
    private String altText; // Mô tả thay thế (cho hình ảnh, SEO/accessibility)

    @Column(length = 255)
    private String title; // Tiêu đề file

    @Column(length = 500)
    private String description; // Mô tả nội dung file

    @Column(length = 50)
    private String module;
    // Phân loại file thuộc module nào: LISTENING, READING, WRITING, SPEAKING, COURSE...

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(length = 100)
    private String checksum; // MD5/SHA256 để kiểm tra tính toàn vẹn file

    // Người upload
    @ManyToOne
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
