package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.SpeakingFrame;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakingFrameRepository extends JpaRepository<SpeakingFrame, Long> {
    @Cacheable("speakingFrames")
    List<SpeakingFrame> findByIsActiveTrue();

    @Cacheable("speakingFramesByType")
    List<SpeakingFrame> findByFrameTypeAndIsActiveTrue(String frameType);

    @Override
    @CacheEvict(value = {"speakingFrames", "speakingFramesByType"}, allEntries = true)
    <S extends SpeakingFrame> S save(S entity);

    @Override
    @CacheEvict(value = {"speakingFrames", "speakingFramesByType"}, allEntries = true)
    void deleteById(Long id);

    @Override
    @CacheEvict(value = {"speakingFrames", "speakingFramesByType"}, allEntries = true)
    void delete(SpeakingFrame entity);
}
