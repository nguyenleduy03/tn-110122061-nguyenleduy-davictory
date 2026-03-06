package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.AudioTranscript;
import com.victory.DAVictory.entity.MediaFile;
import com.victory.DAVictory.entity.PassageContent;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.MediaType;
import com.victory.DAVictory.repository.AudioTranscriptRepository;
import com.victory.DAVictory.repository.MediaFileRepository;
import com.victory.DAVictory.repository.PassageContentRepository;
import com.victory.DAVictory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaFileRepository mediaFileRepository;
    private final AudioTranscriptRepository audioTranscriptRepository;
    private final PassageContentRepository passageContentRepository;
    private final UserRepository userRepository;

    // ===== MEDIA FILES =====

    @Transactional
    public MediaFile saveMediaFile(MediaFile mediaFile) {
        // Kiểm tra trùng lặp file qua checksum
        if (mediaFile.getChecksum() != null &&
                mediaFileRepository.existsByChecksum(mediaFile.getChecksum())) {
            return mediaFileRepository.findByChecksum(mediaFile.getChecksum()).get();
        }
        return mediaFileRepository.save(mediaFile);
    }

    public MediaFile getMediaFileById(Long id) {
        return mediaFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy media file"));
    }

    public List<MediaFile> getMediaFilesByType(MediaType mediaType) {
        return mediaFileRepository.findByMediaType(mediaType);
    }

    public List<MediaFile> getMediaFilesByModule(String module) {
        return mediaFileRepository.findByModule(module);
    }

    @Transactional
    public void deleteMediaFile(Long id) {
        if (!mediaFileRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy media file");
        }
        mediaFileRepository.deleteById(id);
    }

    // ===== AUDIO TRANSCRIPTS =====

    @Transactional
    public AudioTranscript saveTranscript(AudioTranscript transcript) {
        return audioTranscriptRepository.save(transcript);
    }

    public AudioTranscript getTranscriptByMediaFileId(Long mediaFileId) {
        return audioTranscriptRepository.findByMediaFileId(mediaFileId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy transcript cho audio này"));
    }

    @Transactional
    public AudioTranscript verifyTranscript(Long transcriptId, Long verifiedByUserId) {
        AudioTranscript transcript = audioTranscriptRepository.findById(transcriptId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy transcript"));
        User verifier = userRepository.findById(verifiedByUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        transcript.setIsVerified(true);
        transcript.setVerifiedBy(verifier);
        transcript.setVerifiedAt(java.time.LocalDateTime.now());
        return audioTranscriptRepository.save(transcript);
    }

    // ===== PASSAGE CONTENTS =====

    @Transactional
    public PassageContent savePassage(PassageContent passage) {
        return passageContentRepository.save(passage);
    }

    public PassageContent getPassageById(Long id) {
        return passageContentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy passage"));
    }

    public List<PassageContent> searchPassages(String keyword) {
        return passageContentRepository.searchByKeyword(keyword);
    }

    public List<PassageContent> getPassagesByTopic(String topic) {
        return passageContentRepository.findByTopic(topic);
    }

    public List<PassageContent> getPassagesByWordCount(Integer min, Integer max) {
        return passageContentRepository.findByWordCountBetween(min, max);
    }

    @Transactional
    public PassageContent verifyPassage(Long passageId, Long verifiedByUserId) {
        PassageContent passage = passageContentRepository.findById(passageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy passage"));
        User verifier = userRepository.findById(verifiedByUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        passage.setIsVerified(true);
        passage.setVerifiedBy(verifier);
        passage.setVerifiedAt(java.time.LocalDateTime.now());
        return passageContentRepository.save(passage);
    }

    @Transactional
    public void deletePassage(Long id) {
        if (!passageContentRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy passage");
        }
        passageContentRepository.deleteById(id);
    }
}
