package com.victory.DAVictory.controller;

import com.victory.DAVictory.entity.AudioTranscript;
import com.victory.DAVictory.entity.MediaFile;
import com.victory.DAVictory.entity.PassageContent;
import com.victory.DAVictory.enums.MediaType;
import com.victory.DAVictory.service.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Media Management", description = "API quản lý file media, audio transcript và passage content")
public class MediaController {

    private final MediaService mediaService;

    // ===== MEDIA FILES =====

    @PostMapping("/files")
    @Operation(summary = "Upload thông tin media file", description = "Lưu metadata của file audio/image/video")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Lưu thành công"),
        @ApiResponse(responseCode = "400", description = "Dữ liệu không hợp lệ")
    })
    public ResponseEntity<MediaFile> saveMediaFile(@RequestBody MediaFile mediaFile) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaService.saveMediaFile(mediaFile));
    }

    @GetMapping("/files/{id}")
    @Operation(summary = "Lấy media file theo ID")
    @ApiResponse(responseCode = "200", description = "Tìm thấy")
    public ResponseEntity<MediaFile> getMediaFileById(
            @Parameter(description = "ID của media file", required = true) @PathVariable Long id) {
        try {
            return ResponseEntity.ok(mediaService.getMediaFileById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/files")
    @Operation(summary = "Lấy danh sách media files theo loại và module")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<MediaFile>> getMediaFiles(
            @Parameter(description = "Loại media: AUDIO, IMAGE, VIDEO, DOCUMENT")
            @RequestParam(required = false) MediaType mediaType,
            @Parameter(description = "Module: LISTENING, READING, WRITING...")
            @RequestParam(required = false) String module) {
        if (mediaType != null && module != null) {
            return ResponseEntity.ok(mediaService.getMediaFilesByModule(module));
        } else if (mediaType != null) {
            return ResponseEntity.ok(mediaService.getMediaFilesByType(mediaType));
        } else if (module != null) {
            return ResponseEntity.ok(mediaService.getMediaFilesByModule(module));
        }
        return ResponseEntity.ok(List.of());
    }

    @DeleteMapping("/files/{id}")
    @Operation(summary = "Xóa media file")
    @ApiResponse(responseCode = "204", description = "Xóa thành công")
    public ResponseEntity<Void> deleteMediaFile(
            @Parameter(description = "ID của media file", required = true) @PathVariable Long id) {
        try {
            mediaService.deleteMediaFile(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ===== AUDIO TRANSCRIPTS =====

    @PostMapping("/transcripts")
    @Operation(summary = "Tạo transcript cho audio", description = "Lưu transcript và timecode cho file audio listening")
    @ApiResponse(responseCode = "201", description = "Tạo thành công")
    public ResponseEntity<AudioTranscript> saveTranscript(@RequestBody AudioTranscript transcript) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaService.saveTranscript(transcript));
    }

    @GetMapping("/transcripts/audio/{mediaFileId}")
    @Operation(summary = "Lấy transcript theo audio file ID")
    @ApiResponse(responseCode = "200", description = "Tìm thấy")
    public ResponseEntity<AudioTranscript> getTranscriptByAudio(
            @Parameter(description = "ID của media file audio", required = true) @PathVariable Long mediaFileId) {
        try {
            return ResponseEntity.ok(mediaService.getTranscriptByMediaFileId(mediaFileId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/transcripts/{id}/verify")
    @Operation(summary = "Xác nhận transcript đã kiểm duyệt")
    @ApiResponse(responseCode = "200", description = "Xác nhận thành công")
    public ResponseEntity<AudioTranscript> verifyTranscript(
            @Parameter(description = "ID của transcript", required = true) @PathVariable Long id,
            @Parameter(description = "ID của người kiểm duyệt", required = true) @RequestParam Long verifiedByUserId) {
        try {
            return ResponseEntity.ok(mediaService.verifyTranscript(id, verifiedByUserId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ===== PASSAGE CONTENTS =====

    @PostMapping("/passages")
    @Operation(summary = "Tạo passage content", description = "Thêm bài đọc mới cho phần Reading")
    @ApiResponse(responseCode = "201", description = "Tạo thành công")
    public ResponseEntity<PassageContent> savePassage(@RequestBody PassageContent passage) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaService.savePassage(passage));
    }

    @GetMapping("/passages/{id}")
    @Operation(summary = "Lấy passage theo ID")
    @ApiResponse(responseCode = "200", description = "Tìm thấy")
    public ResponseEntity<PassageContent> getPassageById(
            @Parameter(description = "ID của passage", required = true) @PathVariable Long id) {
        try {
            return ResponseEntity.ok(mediaService.getPassageById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/passages/search")
    @Operation(summary = "Tìm kiếm passage theo từ khóa hoặc chủ đề")
    @ApiResponse(responseCode = "200", description = "Thành công")
    public ResponseEntity<List<PassageContent>> searchPassages(
            @Parameter(description = "Từ khóa tìm kiếm") @RequestParam(required = false) String keyword,
            @Parameter(description = "Chủ đề bài đọc") @RequestParam(required = false) String topic,
            @Parameter(description = "Số từ tối thiểu") @RequestParam(required = false) Integer minWords,
            @Parameter(description = "Số từ tối đa") @RequestParam(required = false) Integer maxWords) {
        if (keyword != null) {
            return ResponseEntity.ok(mediaService.searchPassages(keyword));
        } else if (topic != null) {
            return ResponseEntity.ok(mediaService.getPassagesByTopic(topic));
        } else if (minWords != null && maxWords != null) {
            return ResponseEntity.ok(mediaService.getPassagesByWordCount(minWords, maxWords));
        }
        return ResponseEntity.ok(List.of());
    }

    @PutMapping("/passages/{id}/verify")
    @Operation(summary = "Xác nhận passage đã kiểm duyệt")
    @ApiResponse(responseCode = "200", description = "Xác nhận thành công")
    public ResponseEntity<PassageContent> verifyPassage(
            @Parameter(description = "ID của passage", required = true) @PathVariable Long id,
            @Parameter(description = "ID của người kiểm duyệt", required = true) @RequestParam Long verifiedByUserId) {
        try {
            return ResponseEntity.ok(mediaService.verifyPassage(id, verifiedByUserId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/passages/{id}")
    @Operation(summary = "Xóa passage")
    @ApiResponse(responseCode = "204", description = "Xóa thành công")
    public ResponseEntity<Void> deletePassage(
            @Parameter(description = "ID của passage", required = true) @PathVariable Long id) {
        try {
            mediaService.deletePassage(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
