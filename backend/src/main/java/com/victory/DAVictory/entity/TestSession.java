package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_sessions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"test_id", "session_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Đề thi chứa session này
    @ManyToOne
    @JoinColumn(name = "test_id", nullable = false)
    private Test test;

    // Session gốc (Listening / Reading / Writing / Speaking)
    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(nullable = false)
    private Integer orderIndex; // Thứ tự session trong đề: 1, 2, 3, 4

    @Column(nullable = false)
    private Boolean isIncluded = true; // Có đưa vào đề hay tạm ẩn

    @Column
    private Integer durationMinutes;
    // Override thời gian nếu khác mặc định (null = dùng thời gian mặc định của session)

    @Column(length = 255)
    private String instructions;
    // Override hướng dẫn riêng cho session này trong đề (null = dùng mặc định)

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Các part được chọn vào session này trong đề thi
    @OneToMany(mappedBy = "testSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<TestPart> testParts = new ArrayList<>();
}
