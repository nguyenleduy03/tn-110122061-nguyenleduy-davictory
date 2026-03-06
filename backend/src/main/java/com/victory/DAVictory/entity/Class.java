package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Nhóm 11 - QUẢN LÝ TRUNG TÂM
 * Bảng classes: lớp học tại trung tâm
 */
@Entity
@Table(name = "classes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Class {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id", nullable = false)
    private Center center;

    @Column(nullable = false, unique = true, length = 30)
    private String code; // Mã lớp: "IELTS-A1-2026"

    @Column(nullable = false, length = 100)
    private String name; // Tên lớp: "IELTS Band 6.0 - Khóa A1 2026"

    @Column(length = 30)
    private String level;
    // BEGINNER, ELEMENTARY, INTERMEDIATE, UPPER_INTERMEDIATE, ADVANCED

    @Column(length = 20)
    private String targetBand; // Mục tiêu band: "5.0", "6.5", "7.0"

    @Column(length = 20)
    private String classType;
    // OFFLINE, ONLINE, HYBRID

    @Column
    private Integer maxStudents; // Sĩ số tối đa

    @Column(nullable = false)
    private LocalDate startDate; // Ngày khai giảng

    @Column
    private LocalDate endDate; // Ngày bế giảng (dự kiến)

    @Column(length = 50)
    private String schedule;
    // Lịch học: "Thứ 2,4,6 - 18:00–20:00"

    @Column(length = 20)
    private String status;
    // UPCOMING, ACTIVE, COMPLETED, CANCELLED

    @Column(length = 255)
    private String roomLocation; // Phòng học / link online

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "clazz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("enrolledAt ASC")
    private List<ClassStudent> classStudents = new ArrayList<>();

    @OneToMany(mappedBy = "clazz", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClassTeacher> classTeachers = new ArrayList<>();

    @OneToMany(mappedBy = "clazz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dueDate ASC")
    private List<Assignment> assignments = new ArrayList<>();
}
