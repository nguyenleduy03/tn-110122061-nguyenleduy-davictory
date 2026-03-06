package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestPart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestPartRepository extends JpaRepository<TestPart, Long> {

    List<TestPart> findByTestSessionId(Long testSessionId);

    List<TestPart> findByTestSessionIdOrderByOrderIndexAsc(Long testSessionId);

    Optional<TestPart> findByTestSessionIdAndPartId(Long testSessionId, Long partId);

    List<TestPart> findByTestSessionIdAndIsIncluded(Long testSessionId, Boolean isIncluded);
}
