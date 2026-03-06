package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.DifficultyLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DifficultyLevelRepository extends JpaRepository<DifficultyLevel, Long> {

    Optional<DifficultyLevel> findByName(String name);

    Optional<DifficultyLevel> findByLevel(Integer level);

    List<DifficultyLevel> findAllByOrderByLevelAsc();

    boolean existsByName(String name);

    boolean existsByLevel(Integer level);
}
