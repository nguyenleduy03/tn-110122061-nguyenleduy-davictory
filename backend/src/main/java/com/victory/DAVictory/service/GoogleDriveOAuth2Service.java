package com.victory.DAVictory.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class GoogleDriveOAuth2Service {

    @Value("${google.drive.client-id}")
    private String clientId;

    @Value("${google.drive.client-secret}")
    private String clientSecret;

    @Value("${google.drive.redirect-uri}")
    private String redirectUri;

    @Value("${google.drive.folder.id}")
    private String folderId;

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String TOKENS_DIRECTORY_PATH = "tokens";

    private final Map<String, String> folderCache = new ConcurrentHashMap<>();

    private GoogleAuthorizationCodeFlow flow;

    private GoogleAuthorizationCodeFlow getFlow() throws Exception {
        if (flow == null) {
            HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            
            GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
            details.setClientId(clientId);
            details.setClientSecret(clientSecret);
            
            GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
            clientSecrets.setInstalled(details);

            flow = new GoogleAuthorizationCodeFlow.Builder(
                    httpTransport, JSON_FACTORY, clientSecrets,
                    Collections.singleton(DriveScopes.DRIVE_FILE))
                    .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                    .setAccessType("offline")
                    .build();
        }
        return flow;
    }

    public String getAuthorizationUrl() throws Exception {
        return getFlow().newAuthorizationUrl().setRedirectUri(redirectUri).build();
    }

    public void storeCredential(String code) throws Exception {
        var tokenResponse = getFlow().newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();
        getFlow().createAndStoreCredential(tokenResponse, "user");
    }

    public boolean isAuthorized() throws Exception {
        try {
            Credential credential = getFlow().loadCredential("user");
            if (credential == null) {
                System.out.println("🔍 Checking authorization: credential not found");
                return false;
            }

            // Refresh token nếu access token bị hết hạn để trạng thái không bị mất tạm thời
            if (credential.getAccessToken() == null
                    || (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() < 60)) {
                boolean refreshed = credential.refreshToken();
                if (!refreshed) {
                    System.out.println("❌ Authorization refresh failed");
                    return false;
                }
            }
            
            System.out.println("🔍 Checking authorization:");
            System.out.println("   - Credential exists: true");
            System.out.println("   - Access token exists: " + (credential.getAccessToken() != null));
            
            return true;
        } catch (Exception e) {
            System.out.println("❌ Error checking authorization: " + e.getMessage());
            return false;
        }
    }

    public void revokeAccess() throws Exception {
        Credential credential = getFlow().loadCredential("user");
        if (credential != null) {
            String token = credential.getAccessToken();
            if (token != null) {
                // Revoke token via Google API
                URL url = new URL("https://oauth2.googleapis.com/revoke?token=" + token);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.getResponseCode();
                conn.disconnect();
            }
            // Delete stored credential
            getFlow().getCredentialDataStore().delete("user");
        }
    }

    public Map<String, Object> getDriveInfo() throws Exception {
        Map<String, Object> info = new HashMap<>();
        
        try {
            Drive service = getDriveService();
            
            // Get about info
            var about = service.about().get()
                    .setFields("user(emailAddress,displayName),storageQuota(limit,usage,usageInDrive)")
                    .execute();
            
            info.put("email", about.getUser().getEmailAddress());
            info.put("displayName", about.getUser().getDisplayName());
            
            if (about.getStorageQuota() != null) {
                Long limit = about.getStorageQuota().getLimit();
                Long usage = about.getStorageQuota().getUsage();
                
                info.put("storageLimit", formatBytes(limit));
                info.put("storageUsage", formatBytes(usage));
                info.put("storagePercent", limit > 0 ? (usage * 100 / limit) : 0);
            }
            
            DriveFolderStats stats = collectFolderStats(service, folderId);
            info.put("totalFiles", stats.totalFiles);
            info.put("folderSize", formatBytes(stats.totalSize));
            
        } catch (Exception e) {
            log.error("Error getting drive info", e);
        }
        
        return info;
    }
    
    private String formatBytes(Long bytes) {
        if (bytes == null) return "0 B";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.2f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.2f MB", bytes / (1024.0 * 1024));
        return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
    }

    private Drive getDriveService() throws Exception {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        Credential credential = getFlow().loadCredential("user");
        
        if (credential == null) {
            throw new RuntimeException("No credentials found. Please authorize first.");
        }

        if (credential.getAccessToken() == null || (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() < 60)) {
            boolean refreshed = credential.refreshToken();
            if (!refreshed) {
                throw new RuntimeException("Unable to refresh Google Drive access token.");
            }
        }

        return new Drive.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName("DAVictory IELTS")
                .build();
    }

    public String getAccessToken() throws Exception {
        Credential credential = getFlow().loadCredential("user");
        if (credential == null) {
            throw new RuntimeException("No credentials found. Please authorize first.");
        }

        if (credential.getAccessToken() == null || (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() < 60)) {
            boolean refreshed = credential.refreshToken();
            if (!refreshed) {
                throw new RuntimeException("Unable to refresh Google Drive access token.");
            }
        }

        return credential.getAccessToken();
    }

    public String getFolderIdForPath(String folderPath) throws Exception {
        return resolveFolderPath(folderPath);
    }

    public String findFolderIdForPath(String folderPath) throws Exception {
        if (folderPath == null || folderPath.isBlank()) {
            return folderId;
        }

        String currentParentId = folderId;
        for (String rawSegment : folderPath.split("/")) {
            String segment = rawSegment.trim();
            if (segment.isEmpty()) {
                continue;
            }

            String childId = findChildFolderId(currentParentId, segment);
            if (childId == null) {
                return null;
            }
            currentParentId = childId;
        }
        return currentParentId;
    }

    public String getRootFolderId() {
        return folderId;
    }

    public String getFileMimeType(String fileId) throws Exception {
        File metadata = getDriveService().files().get(fileId)
                .setFields("mimeType")
                .execute();
        return metadata.getMimeType();
    }

    public String getFileName(String fileId) throws Exception {
        File metadata = getDriveService().files().get(fileId)
                .setFields("name")
                .execute();
        return metadata.getName();
    }

    public void renameFile(String fileId, String newName) throws Exception {
        File metadata = new File();
        metadata.setName(newName);
        getDriveService().files().update(fileId, metadata)
                .setFields("id,name")
                .execute();
    }

    public void renameFolder(String folderId, String newName) throws Exception {
        File metadata = new File();
        metadata.setName(newName);
        getDriveService().files().update(folderId, metadata)
                .setFields("id,name")
                .execute();
    }

    public String extractFileId(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        if (url.contains("/preview/")) {
            return url.substring(url.lastIndexOf('/') + 1);
        }

        if (url.contains("id=")) {
            return url.split("id=")[1].split("&")[0];
        }

        if (url.contains("/file/d/")) {
            String tail = url.substring(url.indexOf("/file/d/") + "/file/d/".length());
            return tail.contains("/") ? tail.substring(0, tail.indexOf('/')) : tail;
        }

        return null;
    }

    public byte[] downloadFile(String fileId) throws Exception {
        try (InputStream inputStream = getDriveService().files().get(fileId).executeMediaAsInputStream();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            inputStream.transferTo(outputStream);
            return outputStream.toByteArray();
        }
    }

    public String uploadFile(MultipartFile multipartFile, String folderPath) throws Exception {
        String originalFilename = multipartFile.getOriginalFilename() != null ? multipartFile.getOriginalFilename() : "file";
        String tempSuffix = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path tempFile = Files.createTempFile("upload-", tempSuffix);

        try {
            multipartFile.transferTo(tempFile.toFile());

            String uniqueFileName = generateUniqueFileName(originalFilename, folderPath);

            File fileMetadata = new File();
            fileMetadata.setName(uniqueFileName);
            fileMetadata.setParents(Collections.singletonList(resolveFolderPath(folderPath)));

            FileContent mediaContent = new FileContent(multipartFile.getContentType(), tempFile.toFile());
            File uploadedFile = getDriveService().files()
                    .create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();

            makeFilePublic(uploadedFile.getId());

            return String.format("/api/files/preview/%s", uploadedFile.getId());
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    private String generateUniqueFileName(String originalFilename, String folder) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss_SSS"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String sanitized = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        
        // Sanitize folder name (remove / and special chars)
        String folderName = folder != null ? folder.replaceAll("[^a-zA-Z0-9_-]", "_").toUpperCase() : "FILE";
        
        int lastDot = sanitized.lastIndexOf('.');
        if (lastDot > 0) {
            String name = sanitized.substring(0, lastDot);
            String ext = sanitized.substring(lastDot);
            return String.format("DAVictory_%s_%s_%s_%s%s", 
                folderName, 
                timestamp, 
                uuid, 
                name, 
                ext);
        }
        return String.format("DAVictory_%s_%s_%s_%s", 
            folderName, 
            timestamp, 
            uuid, 
            sanitized);
    }

    private void makeFilePublic(String fileId) throws Exception {
        Permission permission = new Permission()
                .setType("anyone")
                .setRole("reader");
        getDriveService().permissions().create(fileId, permission).execute();
    }

    private String resolveFolderPath(String folderPath) throws Exception {
        if (folderPath == null || folderPath.isBlank()) {
            return folderId;
        }

        String currentParentId = folderId;
        for (String rawSegment : folderPath.split("/")) {
            String segment = rawSegment.trim();
            if (segment.isEmpty()) {
                continue;
            }
            currentParentId = getOrCreateChildFolder(currentParentId, segment);
        }
        return currentParentId;
    }

    private String getOrCreateChildFolder(String parentId, String folderName) throws Exception {
        String cacheKey = parentId + ":" + folderName;
        if (folderCache.containsKey(cacheKey)) {
            return folderCache.get(cacheKey);
        }

        String escapedFolderName = folderName.replace("'", "\\'");
        String query = String.format(
                "name='%s' and mimeType='application/vnd.google-apps.folder' and '%s' in parents and trashed=false",
                escapedFolderName, parentId);
        var result = getDriveService().files().list()
                .setQ(query)
                .setSpaces("drive")
                .setFields("files(id, name)")
                .execute();

        String resolvedId;
        if (result.getFiles().isEmpty()) {
            resolvedId = createFolder(folderName, parentId);
        } else {
            resolvedId = result.getFiles().get(0).getId();
        }

        folderCache.put(cacheKey, resolvedId);
        return resolvedId;
    }

    private String findChildFolderId(String parentId, String folderName) throws Exception {
        String escapedFolderName = folderName.replace("'", "\\'");
        String query = String.format(
                "name='%s' and mimeType='application/vnd.google-apps.folder' and '%s' in parents and trashed=false",
                escapedFolderName, parentId);
        var result = getDriveService().files().list()
                .setQ(query)
                .setSpaces("drive")
                .setFields("files(id, name)")
                .execute();

        if (result.getFiles().isEmpty()) {
            return null;
        }
        return result.getFiles().get(0).getId();
    }

    private String createFolder(String folderName, String parentId) throws Exception {
        File fileMetadata = new File();
        fileMetadata.setName(folderName);
        fileMetadata.setMimeType("application/vnd.google-apps.folder");
        fileMetadata.setParents(Collections.singletonList(parentId));

        File folder = getDriveService().files()
                .create(fileMetadata)
                .setFields("id")
                .execute();
        return folder.getId();
    }

    private DriveFolderStats collectFolderStats(Drive service, String parentId) throws Exception {
        DriveFolderStats stats = new DriveFolderStats();
        String pageToken = null;

        do {
            var result = service.files().list()
                    .setQ(String.format("'%s' in parents and trashed=false", parentId))
                    .setSpaces("drive")
                    .setFields("nextPageToken, files(id, name, size, mimeType)")
                    .setPageToken(pageToken)
                    .execute();

            for (var file : result.getFiles()) {
                if ("application/vnd.google-apps.folder".equals(file.getMimeType())) {
                    DriveFolderStats childStats = collectFolderStats(service, file.getId());
                    stats.totalFiles += childStats.totalFiles;
                    stats.totalSize += childStats.totalSize;
                } else {
                    stats.totalFiles++;
                    if (file.getSize() != null) {
                        stats.totalSize += file.getSize();
                    }
                }
            }

            pageToken = result.getNextPageToken();
        } while (pageToken != null && !pageToken.isBlank());

        return stats;
    }

    private static class DriveFolderStats {
        private long totalFiles = 0;
        private long totalSize = 0;
    }

    public void deleteFile(String fileId) throws Exception {
        getDriveService().files().delete(fileId).execute();
    }
}
