package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestVersionRepository extends JpaRepository<TestVersion, Long> {

    void deleteByTestId(Long testId);

    List<TestVersion> findByTestIdOrderByVersionNumberDesc(Long testId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM TestVersion v WHERE v.test.id = :testId")
    int findMaxVersionNumber(@Param("testId") Long testId);
}
