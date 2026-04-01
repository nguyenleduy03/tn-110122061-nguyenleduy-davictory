import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getDriveUploadConfig = async (mediaType, module, testTitle, testId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/files/drive-config`, {
      params: { mediaType, module, testTitle, testId },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    const backendMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
    throw new Error(`Không lấy được cấu hình Google Drive: ${backendMessage}`);
  }
};

const uploadDirectToGoogleDrive = async (file, mediaType, module, testTitle, testId) => {
  const { accessToken, rootFolderId, folderPath } = await getDriveUploadConfig(mediaType, module, testTitle, testId);
  const fileName = file.name || `upload-${Date.now()}`;

  const sanitizeSegment = (value) => String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');

  const findOrCreateFolder = async (parentId, name) => {
    const escaped = name.replace(/'/g, "\\'");
    const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${escaped}' and '${parentId}' in parents`;
    const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listResponse.ok) {
      throw new Error(`Google Drive folder lookup failed: ${await listResponse.text()}`);
    }
    const listData = await listResponse.json();
    if (listData.files?.length) return listData.files[0].id;

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
    if (!createResponse.ok) {
      throw new Error(`Google Drive folder create failed: ${await createResponse.text()}`);
    }
    const createData = await createResponse.json();
    return createData.id;
  };

  const resolveFolderPath = async (parentId, path) => {
    const segments = String(path || '').split('/').map(sanitizeSegment).filter(Boolean);
    let current = parentId;
    for (const segment of segments) {
      current = await findOrCreateFolder(current, segment);
    }
    return current;
  };

  const folderId = await resolveFolderPath(rootFolderId, folderPath);

  const createResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': file.type || 'application/octet-stream',
      'X-Upload-Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  const createText = await createResponse.text();
  if (!createResponse.ok) {
    throw new Error(`Google Drive upload failed: ${createText}`);
  }

  const created = JSON.parse(createText);
  const fileId = created.id;

  const moveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(folderId)}&fields=id`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!moveResponse.ok) {
    const moveText = await moveResponse.text();
    throw new Error(`Google Drive folder move failed: ${moveText}`);
  }

  const permResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!permResponse.ok) {
    const permText = await permResponse.text();
    throw new Error(`Google Drive permission failed: ${permText}`);
  }

  return {
    id: fileId,
    url: `/api/files/preview/${fileId}`,
    fileName,
    mediaType,
    folderPath,
  };
};

export const fileApi = {
  /**
   * Upload file lên Google Drive
   * @param {File} file - File object từ input
   * @param {string} mediaType - AUDIO | IMAGE | VIDEO | DOCUMENT
   * @param {string} module - LISTENING | READING | WRITING | SPEAKING
   * @param {string} testTitle - Tên đề thi để tạo cấu trúc thư mục Drive
   * @returns {Promise<{id, url, fileName, mediaType}>}
   */
  uploadFile: async (file, mediaType, module, testTitle, testId) => {
    return uploadDirectToGoogleDrive(file, mediaType, module, testTitle, testId);
  },

  /**
   * Upload audio cho Listening
   */
  uploadListeningAudio: async (file, testTitle, testId) => {
    return fileApi.uploadFile(file, 'AUDIO', 'LISTENING', testTitle, testId);
  },

  /**
   * Upload image cho Reading/Writing
   */
  uploadImage: async (file, module = 'READING', testTitle, testId) => {
    return fileApi.uploadFile(file, 'IMAGE', module, testTitle, testId);
  },

  /**
   * Upload audio cho Speaking
   */
  uploadSpeakingAudio: async (file, testTitle, testId) => {
    return fileApi.uploadFile(file, 'AUDIO', 'SPEAKING', testTitle, testId);
  },

  /**
   * Delete file từ Google Drive
   */
  deleteFile: async (fileId) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.data;
  },
};

export default fileApi;
