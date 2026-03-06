package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.MatchingPair;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchingPairRepository extends JpaRepository<MatchingPair, Long> {

    List<MatchingPair> findByQuestionGroupIdOrderByOrderIndexAsc(Long groupId);

    List<MatchingPair> findByQuestionGroupIdAndMatchType(Long groupId, String matchType);
}
