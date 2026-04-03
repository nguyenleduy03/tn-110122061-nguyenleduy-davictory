package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.TestSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TestSettingRepository extends JpaRepository<TestSetting, Long> {

    Optional<TestSetting> findByTestId(Long testId);

    boolean existsByTestId(Long testId);

    void deleteByTestId(Long testId);
}
