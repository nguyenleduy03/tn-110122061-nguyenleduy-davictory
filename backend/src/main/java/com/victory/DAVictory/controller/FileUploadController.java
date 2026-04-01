package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.MediaFile;
import com.victory.DAVictory.entity.User;
import com.victory.DAVictory.enums.MediaType;
import com.victory.DAVictory.service.FileUploadService;
import com.victory.DAVictory.service.GoogleDriveOAuth2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final GoogleDriveOAuth2Service driveService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("mediaType") MediaType mediaType,
            @RequestParam("module") String module,
            @RequestParam(value = "testTitle", required = false) String testTitle,
            @AuthenticationPrincipal User user) {
        try {
            MediaFile mediaFile = fileUploadService.uploadFile(file, mediaType, module, testTitle, user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", mediaFile.getId());
            response.put("url", mediaFile.getFileUrl());
            response.put("path", mediaFile.getFilePath());
            response.put("mediaType", mediaFile.getMediaType());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/drive-config")
    public ResponseEntity<?> getDriveConfig(
            @RequestParam("mediaType") MediaType mediaType,
            @RequestParam("module") String module,
            @RequestParam(value = "testTitle", required = false) String testTitle) {
        try {
            String accessToken = driveService.getAccessToken();
            String folderPath = fileUploadService.buildFolderPath(testTitle, module, mediaType);

            Map<String, Object> response = new HashMap<>();
            response.put("accessToken", accessToken);
            response.put("rootFolderId", driveService.getRootFolderId());
            response.put("folderPath", folderPath);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/preview/{fileId}")
    public ResponseEntity<byte[]> previewFile(@PathVariable String fileId) {
        try {
            byte[] data = driveService.downloadFile(fileId);
            String mimeType = driveService.getFileMimeType(fileId);

            return ResponseEntity.ok()
                    .header("Content-Type", mimeType != null ? mimeType : "application/octet-stream")
                    .header("Content-Disposition", "inline; filename=media")
                    .body(data);
        } catch (Exception e) {
            byte[] message = ("Preview error: " + e.getMessage()).getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.badRequest()
                    .header("Content-Type", "text/plain; charset=utf-8")
                    .body(message);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(@PathVariable Long id) {
        try {
            fileUploadService.deleteFile(id);
            return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
