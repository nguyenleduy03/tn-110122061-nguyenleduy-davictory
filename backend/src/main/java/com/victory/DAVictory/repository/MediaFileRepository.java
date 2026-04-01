package com.victory.DAVictory.repository;

import com.victory.DAVictory.entity.MediaFile;
import com.victory.DAVictory.enums.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, Long> {

    List<MediaFile> findByMediaType(MediaType mediaType);

    List<MediaFile> findByModule(String module);

    List<MediaFile> findByMediaTypeAndModule(MediaType mediaType, String module);

    List<MediaFile> findByUploadedById(Long userId);

    List<MediaFile> findByIsActive(Boolean isActive);

    boolean existsByChecksum(String checksum);

    Optional<MediaFile> findByChecksum(String checksum);
}
