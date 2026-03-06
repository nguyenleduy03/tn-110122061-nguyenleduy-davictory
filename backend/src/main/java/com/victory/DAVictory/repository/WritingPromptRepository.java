package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.WritingPrompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WritingPromptRepository extends JpaRepository<WritingPrompt, Long> {

    List<WritingPrompt> findByWritingTaskIdAndIsActiveTrueOrderByOrderIndexAsc(Long writingTaskId);

    List<WritingPrompt> findByTopicAndIsActiveTrue(String topic);

    List<WritingPrompt> findByEssayTypeAndIsActiveTrue(String essayType);

    List<WritingPrompt> findByDifficultyLevelIdAndIsActiveTrue(Long difficultyLevelId);
}
