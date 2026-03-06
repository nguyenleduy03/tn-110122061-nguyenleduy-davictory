package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingTopicRepository extends JpaRepository<SpeakingTopic, Long> {

    List<SpeakingTopic> findByIsActiveTrueOrderByOrderIndexAsc();

    List<SpeakingTopic> findByPartAndIsActiveTrueOrderByOrderIndexAsc(String part);

    List<SpeakingTopic> findByCategoryAndIsActiveTrue(String category);

    List<SpeakingTopic> findByDifficultyLevelIdAndIsActiveTrue(Long difficultyLevelId);
}
