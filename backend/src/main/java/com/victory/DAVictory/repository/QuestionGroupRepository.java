package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionGroupRepository extends JpaRepository<QuestionGroup, Long> {

    List<QuestionGroup> findByPartIdOrderByOrderIndexAsc(Long partId);

    List<QuestionGroup> findByPartIdAndIsActiveTrueOrderByOrderIndexAsc(Long partId);

    boolean existsByPartIdAndTitle(Long partId, String title);
}
