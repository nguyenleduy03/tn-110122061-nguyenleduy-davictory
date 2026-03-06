package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingCueCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingCueCardRepository extends JpaRepository<SpeakingCueCard, Long> {

    List<SpeakingCueCard> findBySpeakingTopicIdAndIsActiveTrueOrderByOrderIndexAsc(Long topicId);

    List<SpeakingCueCard> findByDifficultyLevelIdAndIsActiveTrue(Long difficultyLevelId);
}
