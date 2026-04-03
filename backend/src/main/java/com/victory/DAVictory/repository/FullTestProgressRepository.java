package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.FullTestProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FullTestProgressRepository extends JpaRepository<FullTestProgress, Long> {
    Optional<FullTestProgress> findByUserIdAndTestId(Long userId, Long testId);

    List<FullTestProgress> findByUserIdAndStatusOrderByUpdatedAtDesc(Long userId, String status);

    void deleteByTestId(Long testId);
}
