package com.victory.DAVictory.service;

import com.victory.DAVictory.entity.MediaFile;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.MediaType;
import com.victory.DAVictory.repository.MediaFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadService {

    private final GoogleDriveOAuth2Service googleDriveService;
    private final MediaFileRepository mediaFileRepository;

    @Transactional
    public MediaFile uploadFile(MultipartFile file, MediaType mediaType, String module, User uploadedBy) throws Exception {
        String checksum = calculateChecksum(file);
        
        var existing = mediaFileRepository.findByChecksum(checksum);
        if (existing.isPresent()) {
            log.info("File already exists with checksum: {}", checksum);
            return existing.get();
        }

        String folder = String.format("%s/%s", module, mediaType.name().toLowerCase());
        String driveUrl = googleDriveService.uploadFile(file, folder);
        String fileId = extractFileIdFromUrl(driveUrl);

        MediaFile mediaFile = new MediaFile();
        mediaFile.setFileName(file.getOriginalFilename());
        mediaFile.setStoredFileName(UUID.randomUUID() + "_" + file.getOriginalFilename());
        mediaFile.setFilePath(folder);
        mediaFile.setFileUrl(driveUrl);
        mediaFile.setMediaType(mediaType);
        mediaFile.setMimeType(file.getContentType());
        mediaFile.setFileSize(file.getSize());
        mediaFile.setModule(module);
        mediaFile.setChecksum(checksum);
        mediaFile.setUploadedBy(uploadedBy);
        mediaFile.setIsActive(true);

        return mediaFileRepository.save(mediaFile);
    }

    @Transactional
    public void deleteFile(Long mediaFileId) throws Exception {
        MediaFile mediaFile = mediaFileRepository.findById(mediaFileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        String fileId = extractFileIdFromUrl(mediaFile.getFileUrl());
        googleDriveService.deleteFile(fileId);
        mediaFileRepository.deleteById(mediaFileId);
    }

    private String calculateChecksum(MultipartFile file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(file.getBytes());
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String extractFileIdFromUrl(String url) {
        if (url.contains("id=")) {
            return url.split("id=")[1].split("&")[0];
        }
        return null;
    }
}
