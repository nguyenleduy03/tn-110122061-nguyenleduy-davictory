package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestSessionRepository extends JpaRepository<TestSession, Long> {

    List<TestSession> findByTestId(Long testId);

    List<TestSession> findByTestIdOrderByOrderIndexAsc(Long testId);

    Optional<TestSession> findByTestIdAndSessionId(Long testId, Long sessionId);

    List<TestSession> findByTestIdAndIsIncluded(Long testId, Boolean isIncluded);
}
