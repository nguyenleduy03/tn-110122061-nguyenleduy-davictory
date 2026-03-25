package com.victory.DAVictory.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;

@Slf4j
@Service
public class GoogleDriveService {

    @Value("${google.drive.credentials.path}")
    private String credentialsPath;

    @Value("${google.drive.folder.id}")
    private String folderId;

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private Drive getDriveService() throws Exception {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        GoogleCredential credential = GoogleCredential
                .fromStream(new FileInputStream(credentialsPath))
                .createScoped(Collections.singleton(DriveScopes.DRIVE_FILE));

        return new Drive.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName("DAVictory IELTS")
                .build();
    }

    public String uploadFile(MultipartFile multipartFile, String folder) throws Exception {
        Path tempFile = Files.createTempFile("upload-", multipartFile.getOriginalFilename());
        multipartFile.transferTo(tempFile.toFile());

        File fileMetadata = new File();
        fileMetadata.setName(multipartFile.getOriginalFilename());
        fileMetadata.setParents(Collections.singletonList(getFolderIdByName(folder)));

        FileContent mediaContent = new FileContent(multipartFile.getContentType(), tempFile.toFile());
        File uploadedFile = getDriveService().files()
                .create(fileMetadata, mediaContent)
                .setFields("id")
                .execute();

        makeFilePublic(uploadedFile.getId());
        Files.delete(tempFile);

        return String.format("https://drive.google.com/uc?export=view&id=%s", uploadedFile.getId());
    }

    private void makeFilePublic(String fileId) throws Exception {
        Permission permission = new Permission()
                .setType("anyone")
                .setRole("reader");
        getDriveService().permissions().create(fileId, permission).execute();
    }

    private String getFolderIdByName(String folderName) throws Exception {
        if (folderName == null || folderName.isEmpty()) {
            return folderId;
        }

        String query = String.format("name='%s' and mimeType='application/vnd.google-apps.folder' and '%s' in parents", 
                folderName, folderId);
        var result = getDriveService().files().list()
                .setQ(query)
                .setSpaces("drive")
                .setFields("files(id, name)")
                .execute();

        if (result.getFiles().isEmpty()) {
            return createFolder(folderName);
        }
        return result.getFiles().get(0).getId();
    }

    private String createFolder(String folderName) throws Exception {
        File fileMetadata = new File();
        fileMetadata.setName(folderName);
        fileMetadata.setMimeType("application/vnd.google-apps.folder");
        fileMetadata.setParents(Collections.singletonList(folderId));

        File folder = getDriveService().files()
                .create(fileMetadata)
                .setFields("id")
                .execute();
        return folder.getId();
    }

    public void deleteFile(String fileId) throws Exception {
        getDriveService().files().delete(fileId).execute();
    }
}
