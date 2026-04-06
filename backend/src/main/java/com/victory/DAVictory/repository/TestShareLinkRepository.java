package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestShareLink;
import com.victory.DAVictory.enums.SkillType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TestShareLinkRepository extends JpaRepository<TestShareLink, Long> {

    Optional<TestShareLink> findFirstByTestIdAndSkillTypeAndIsActiveTrueOrderByCreatedAtDesc(Long testId, SkillType skillType);

    Optional<TestShareLink> findFirstByTestIdAndSkillTypeAndTokenAndIsActiveTrue(Long testId, SkillType skillType, String token);

    @Modifying
    @Query("UPDATE TestShareLink s SET s.isActive = false, s.refreshedAt = :refreshedAt WHERE s.test.id = :testId AND s.skillType = :skillType AND s.isActive = true")
    int deactivateActiveLinks(@Param("testId") Long testId,
                              @Param("skillType") SkillType skillType,
                              @Param("refreshedAt") LocalDateTime refreshedAt);

    @Modifying
    @Query("UPDATE TestShareLink s SET s.isActive = false, s.refreshedAt = :deactivatedAt WHERE s.test.id = :testId AND s.skillType = :skillType AND s.isActive = true")
    int deactivateCurrentActiveLink(@Param("testId") Long testId,
                                    @Param("skillType") SkillType skillType,
                                    @Param("deactivatedAt") LocalDateTime deactivatedAt);
}
