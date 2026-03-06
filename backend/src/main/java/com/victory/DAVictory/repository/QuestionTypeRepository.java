package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionTypeRepository extends JpaRepository<QuestionType, Long> {

    Optional<QuestionType> findByCode(String code);

    boolean existsByCode(String code);

    List<QuestionType> findByIsActiveTrueOrderByOrderIndexAsc();

    List<QuestionType> findByApplicableSkillsContainingAndIsActiveTrue(String skill);
}
