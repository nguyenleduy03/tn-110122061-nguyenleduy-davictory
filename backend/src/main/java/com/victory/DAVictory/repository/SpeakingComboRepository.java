package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingCombo;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingComboRepository extends JpaRepository<SpeakingCombo, Long> {
    @Cacheable("speakingCombos")
    List<SpeakingCombo> findByIsActiveTrue();

    @Override
    @CacheEvict(value = {"speakingCombos"}, allEntries = true)
    <S extends SpeakingCombo> S save(S entity);

    @Override
    @CacheEvict(value = {"speakingCombos"}, allEntries = true)
    void deleteById(Long id);

    @Override
    @CacheEvict(value = {"speakingCombos"}, allEntries = true)
    void delete(SpeakingCombo entity);
}
