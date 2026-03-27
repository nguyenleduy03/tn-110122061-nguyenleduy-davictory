package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.Session;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.enums.TestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {

    List<Session> findByTestType(TestType testType);

    List<Session> findBySkillType(SkillType skillType);

    Optional<Session> findBySkillTypeAndTestType(SkillType skillType, TestType testType);

    List<Session> findByIsActive(Boolean isActive);

    List<Session> findByTestTypeOrderByOrderIndexAsc(TestType testType);

    List<Session> findByTestTypeAndSkillTypeOrderByOrderIndexAsc(TestType testType, SkillType skillType);

    boolean existsBySkillTypeAndTestType(SkillType skillType, TestType testType);
}
