package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingFrame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingFrameRepository extends JpaRepository<SpeakingFrame, Long> {
    List<SpeakingFrame> findByIsActiveTrue();
    List<SpeakingFrame> findByFrameTypeAndIsActiveTrue(String frameType);
}
