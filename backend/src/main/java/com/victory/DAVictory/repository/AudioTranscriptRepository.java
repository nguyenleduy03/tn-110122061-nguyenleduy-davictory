package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.AudioTranscript;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioTranscriptRepository extends JpaRepository<AudioTranscript, Long> {

    Optional<AudioTranscript> findByMediaFileId(Long mediaFileId);

    List<AudioTranscript> findByAccent(String accent);

    List<AudioTranscript> findByIsVerified(Boolean isVerified);

    List<AudioTranscript> findByLanguage(String language);

    List<AudioTranscript> findByTopic(String topic);
}
