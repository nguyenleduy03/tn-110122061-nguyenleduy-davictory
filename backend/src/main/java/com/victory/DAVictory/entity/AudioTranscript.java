package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audio_transcripts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AudioTranscript {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liên kết với file audio
    @OneToOne
    @JoinColumn(name = "media_file_id", nullable = false)
    private MediaFile mediaFile;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content; // Toàn bộ nội dung transcript

    @Column(length = 20)
    private String language; // Ngôn ngữ: "en-GB", "en-US"

    @Column(length = 50)
    private String accent;
    // British, American, Australian, Canadian...
    // (IELTS thường dùng British & Australian accent)

    @Column(length = 50)
    private String speakers;
    // Số/tên người nói: "2 speakers (Male + Female)", "1 speaker (Lecturer)"

    @Column(length = 100)
    private String topic; // Chủ đề đoạn nghe

    @Column(columnDefinition = "TEXT")
    private String timecodes;
    // JSON lưu mốc thời gian từng câu:
    // [{"time": "00:00:05", "text": "Hello, I'd like to..."}]

    @Column(columnDefinition = "TEXT")
    private String keywords;
    // JSON danh sách từ khóa quan trọng cần chú ý:
    // ["reservation", "check-in date", "room type"]

    @Column(nullable = false)
    private Boolean isVerified = false; // Đã được kiểm duyệt chưa

    @ManyToOne
    @JoinColumn(name = "verified_by")
    private User verifiedBy; // Người kiểm duyệt transcript

    @Column
    private LocalDateTime verifiedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
