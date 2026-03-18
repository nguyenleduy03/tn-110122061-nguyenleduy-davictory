package com.victory.DAVictory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "full_test_progress", uniqueConstraints = {
        @UniqueConstraint(name = "uk_full_test_progress_user_test", columnNames = { "user_id", "test_id" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FullTestProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    private Test test;

    @Column(nullable = false, length = 20)
    private String status = "IN_PROGRESS";

    @Column(length = 20)
    private String mode;

    @Column
    private Integer currentSection;

    @Column(length = 32)
    private String currentSkill;

    @Column
    private Integer currentPartIndex;

    @Column
    private Integer progressPercent;

    @Column(length = 255)
    private String routePath;

    @Column(length = 2000)
    private String queryString;

    @Column(columnDefinition = "TEXT")
    private String sessionStateJson;

    @Column(columnDefinition = "TEXT")
    private String snapshotJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
