package com.victory.DAVictory.service;

import com.victory.DAVictory.dto.TestSaveRequest;
import com.victory.DAVictory.enums.MediaType;
import com.victory.DAVictory.enums.SkillType;
import com.victory.DAVictory.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriveAssetRenameService {

    private final GoogleDriveOAuth2Service driveService;
    private final SessionRepository sessionRepository;

    public void renameAssetsForTestTitleChange(TestSaveRequest request, String oldTitle, String newTitle) {
        String oldTestTitle = normalizeSegment(oldTitle);
        String newTestTitle = normalizeSegment(newTitle);

        if (request == null || oldTestTitle == null || newTestTitle == null || oldTestTitle.equals(newTestTitle)) {
            return;
        }

        Set<String> renamedFolderIds = new HashSet<>();
        Set<String> renamedFileIds = new HashSet<>();

        renameRootFolderIfExists(oldTestTitle, newTestTitle, renamedFolderIds);

        for (TestSaveRequest.SessionSave session : safeList(request.getSessions())) {
            SkillType skillType = resolveSkillType(session.getSessionId());
            for (TestSaveRequest.PartSave part : safeList(session.getParts())) {
                for (TestSaveRequest.GroupSave group : safeList(part.getQuestionGroups())) {
                    renameDriveUrl(
                            group.getAudioUrl(),
                            buildFolderPath(oldTestTitle, skillType, MediaType.AUDIO),
                            buildFolderPath(newTestTitle, skillType, MediaType.AUDIO),
                            renamedFileIds);

                    renameDriveUrl(
                            group.getImageUrl(),
                            buildFolderPath(oldTestTitle, skillType, MediaType.IMAGE),
                            buildFolderPath(newTestTitle, skillType, MediaType.IMAGE),
                            renamedFileIds);

                    for (TestSaveRequest.QuestionSave question : safeList(group.getQuestions())) {
                        renameDriveUrl(
                                question.getImageUrl(),
                                buildFolderPath(oldTestTitle, skillType, MediaType.IMAGE),
                                buildFolderPath(newTestTitle, skillType, MediaType.IMAGE),
                                renamedFileIds);
                    }
                }
            }
        }
    }

    private SkillType resolveSkillType(Long sessionId) {
        if (sessionId == null) {
            return null;
        }
        return sessionRepository.findById(sessionId)
                .map(session -> session.getSkillType())
                .orElse(null);
    }

    private void renameRootFolderIfExists(String oldTestTitle, String newTestTitle, Set<String> renamedFolderIds) {
        try {
            String folderId = driveService.findFolderIdForPath(buildFolderPath(oldTestTitle, null, null));
            if (folderId == null || !renamedFolderIds.add(folderId)) {
                return;
            }
            driveService.renameFolder(folderId, newTestTitle);
        } catch (Exception e) {
            log.warn("Không thể đổi tên thư mục gốc Drive từ '{}' sang '{}': {}", oldTestTitle, newTestTitle, e.getMessage());
        }
    }

    private void renameDriveUrl(String url, String oldFolderPath, String newFolderPath, Set<String> renamedFileIds) {
        String fileId = driveService.extractFileId(url);
        if (fileId == null || !renamedFileIds.add(fileId)) {
            return;
        }

        try {
            String currentName = driveService.getFileName(fileId);
            String newName = renameFileName(currentName, oldFolderPath, newFolderPath);
            if (newName != null && !newName.equals(currentName)) {
                driveService.renameFile(fileId, newName);
            }
        } catch (Exception e) {
            log.warn("Không thể đổi tên file Drive {}: {}", fileId, e.getMessage());
        }
    }

    private String renameFileName(String currentName, String oldFolderPath, String newFolderPath) {
        if (currentName == null || oldFolderPath == null || newFolderPath == null) {
            return null;
        }

        String oldPrefix = "DAVictory_" + driveToken(oldFolderPath) + "_";
        String newPrefix = "DAVictory_" + driveToken(newFolderPath) + "_";

        if (currentName.startsWith(oldPrefix)) {
            return newPrefix + currentName.substring(oldPrefix.length());
        }

        if (currentName.startsWith("DAVictory_")) {
            return newPrefix + currentName.substring("DAVictory_".length());
        }

        return newPrefix + currentName;
    }

    private String buildFolderPath(String testTitle, SkillType skillType, MediaType mediaType) {
        String root = "exam";
        String normalizedTestTitle = normalizeSegment(testTitle);
        String module = skillType != null ? skillType.name() : null;
        String normalizedModule = normalizeSegment(module);
        String normalizedMediaType = normalizeSegment(mediaType != null ? mediaType.name().toLowerCase() : null);

        if (normalizedTestTitle == null) {
            if (normalizedModule == null) {
                return normalizedMediaType == null ? root : String.join("/", root, normalizedMediaType);
            }
            if (normalizedMediaType == null) {
                return String.join("/", root, normalizedModule);
            }
            return String.join("/", root, normalizedModule, normalizedMediaType);
        }

        if (normalizedModule == null) {
            return normalizedMediaType == null ? String.join("/", root, normalizedTestTitle) : String.join("/", root, normalizedTestTitle, normalizedMediaType);
        }

        if (normalizedMediaType == null) {
            return String.join("/", root, normalizedTestTitle, normalizedModule);
        }

        return String.join("/", root, normalizedTestTitle, normalizedModule, normalizedMediaType);
    }

    private String driveToken(String folderPath) {
        return folderPath.replaceAll("[^a-zA-Z0-9_-]", "_").toUpperCase();
    }

    private String normalizeSegment(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", "_");
    }

    private <T> List<T> safeList(List<T> list) {
        return list == null ? List.of() : list;
    }
}
