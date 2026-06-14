package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nhóm 8 - SPEAKING
 * Bảng speaking_recordings: file audio ghi âm bài nói học viên
 * Một attempt có thể có nhiều file (Part 1, Part 2, Part 3 riêng biệt)
 */
@Entity
@Table(name = "speaking_recordings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_attempt_id", nullable = false)
    private SpeakingAttempt speakingAttempt;

    @Column(nullable = false, length = 500)
    private String audioUrl; // URL file âm thanh (cloud storage / local)

    @Column(length = 20)
    private String audioFormat; // MP3, WAV, OGG, WEBM, M4A

    @Column
    private Integer durationSeconds; // Thời lượng file (giây)

    @Column
    private Long fileSizeBytes; // Kích thước file (bytes)

    @Column
    private Long generatedQuestionId;
    // FK → speaking_generated_questions.id (nullable, null cho data cũ)

    @Column(length = 10)
    private String recordingPart;
    // PART1, PART2, PART3 (xác định đây là file của phần nào)

    @Column(nullable = false)
    private Integer recordingOrder; // Thứ tự khi một attempt có nhiều file

    @Column(columnDefinition = "LONGTEXT")
    private String transcript;
    // Văn bản chuyển từ audio → text (Speech-to-Text)

    @Column(length = 20)
    private String transcriptStatus;
    // PENDING, PROCESSING, COMPLETED, FAILED

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
