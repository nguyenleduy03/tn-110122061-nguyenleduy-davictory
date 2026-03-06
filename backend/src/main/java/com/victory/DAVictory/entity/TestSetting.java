package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "test_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mỗi đề thi có đúng 1 bộ cài đặt
    @OneToOne
    @JoinColumn(name = "test_id", nullable = false, unique = true)
    private Test test;

    // ===== THỜI GIAN =====
    @Column(nullable = false)
    private Boolean useDefaultDuration = true;
    // true = dùng thời gian mặc định theo từng session
    // false = dùng durationMinutes của Test

    @Column(nullable = false)
    private Boolean showTimer = true; // Hiện đồng hồ đếm ngược khi thi

    @Column(nullable = false)
    private Boolean allowPause = false; // Cho phép tạm dừng bài thi

    // ===== NGẪU NHIÊN =====
    @Column(nullable = false)
    private Boolean randomizeQuestions = false; // Xáo trộn câu hỏi trong mỗi nhóm

    @Column(nullable = false)
    private Boolean randomizeSessions = false; // Xáo trộn thứ tự sessions

    @Column(nullable = false)
    private Boolean randomizeOptions = false; // Xáo trộn đáp án trắc nghiệm

    // ===== ĐIỀU HƯỚNG =====
    @Column(nullable = false)
    private Boolean allowSkip = true; // Cho phép bỏ qua câu hỏi

    @Column(nullable = false)
    private Boolean allowGoBack = true; // Cho phép quay lại câu trước

    @Column(nullable = false)
    private Boolean allowReview = true; // Cho phép xem lại toàn bộ trước khi nộp

    @Column(nullable = false)
    private Boolean showProgressBar = true; // Hiện thanh tiến trình

    @Column(nullable = false)
    private Boolean showQuestionNumber = true; // Hiện số thứ tự câu hỏi

    // ===== KẾT QUẢ =====
    @Column(nullable = false)
    private Boolean showResultImmediately = true;
    // true = hiển thị kết quả ngay sau khi nộp
    // false = chờ giáo viên chấm tay (Writing/Speaking)

    @Column(nullable = false)
    private Boolean showCorrectAnswers = true; // Cho xem đáp án đúng sau khi thi

    @Column(nullable = false)
    private Boolean showExplanation = true; // Cho xem giải thích sau khi thi

    @Column(nullable = false)
    private Boolean showBandScore = true; // Hiện band điểm IELTS quy đổi

    // ===== GIỚI HẠN =====
    @Column
    private Integer maxAttempts;
    // Số lần thi tối đa (null = không giới hạn)

    @Column
    private Integer cooldownMinutes;
    // Thời gian chờ giữa 2 lần thi (null = không giới hạn)

    @Column
    private LocalDateTime availableFrom; // Thời điểm bắt đầu mở thi

    @Column
    private LocalDateTime availableTo; // Thời điểm đóng thi

    // ===== PROCTORING =====
    @Column(nullable = false)
    private Boolean requireCamera = false; // Bật camera giám sát

    @Column(nullable = false)
    private Boolean requireFullScreen = false; // Bắt buộc toàn màn hình

    @Column(nullable = false)
    private Boolean detectTabSwitch = false; // Cảnh báo khi chuyển tab

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
