package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.WritingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WritingTaskRepository extends JpaRepository<WritingTask, Long> {

    Optional<WritingTask> findByCode(String code);

    boolean existsByCode(String code);

    List<WritingTask> findByIsActiveTrueOrderByOrderIndexAsc();
}
