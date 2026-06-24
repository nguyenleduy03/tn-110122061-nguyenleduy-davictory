import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

const getStoredUser = () => {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getDriveUploadConfig = async (mediaType, module, testTitle, testId, extraPath = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/files/drive-config`, {
      params: {
        mediaType,
        module,
        testTitle,
        testId,
        classCode: extraPath.classCode,
        testCode: extraPath.testCode,
        skillName: extraPath.skillName,
        studentCode: extraPath.studentCode,
      },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    const backendMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
    throw new Error(`Không lấy được cấu hình Google Drive: ${backendMessage}`);
  }
};

const uploadToGoogleDriveWithProgress = (file, accessToken, onProgress) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id,name', true);
  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
  xhr.setRequestHeader('X-Upload-Content-Type', file.type || 'application/octet-stream');

  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;
    const percent = Math.round((event.loaded / event.total) * 100);
    onProgress?.(percent, 'Đang tải file lên Google Drive...');
  };

  xhr.onload = () => {
    try {
      const text = xhr.responseText || '';
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Google Drive upload failed: ${text || xhr.statusText || xhr.status}`));
        return;
      }
      const data = JSON.parse(text);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  };

  xhr.onerror = () => reject(new Error('Google Drive upload failed: network error'));
  xhr.send(file);
});

const sanitizeSegment = (value) => String(value || '')
  .trim()
  .replace(/[\\/:*?"<>|]/g, '_')
  .replace(/\s+/g, '_');

const findOrCreateFolder = async (accessToken, parentId, name) => {
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

const resolveFolderPathSegments = async (accessToken, parentId, path) => {
  const segments = String(path || '').split('/').map(sanitizeSegment).filter(Boolean);
  let current = parentId;
  for (let idx = 0; idx < segments.length; idx += 1) {
    current = await findOrCreateFolder(accessToken, current, segments[idx]);
  }
  return current;
};

const uploadDirectToGoogleDrive = async (file, mediaType, module, testTitle, testId, options = {}) => {
  const onProgress = options.onProgress;
  onProgress?.(5, 'Đang lấy cấu hình Google Drive...');
  const { accessToken, rootFolderId, folderPath } = await getDriveUploadConfig(mediaType, module, testTitle, testId, options);
  const fileName = file.name || `upload-${Date.now()}`;

  onProgress?.(15, 'Đang chuẩn bị thư mục lưu trữ...');
  const folderId = await resolveFolderPathSegments(accessToken, rootFolderId, folderPath);

  onProgress?.(20, 'Đang tải file lên Google Drive...');
  const created = await uploadToGoogleDriveWithProgress(file, accessToken, (percent, message) => {
    onProgress?.(Math.max(0, Math.min(100, Math.round(percent))), message);
  });
  const fileId = created.id;

  onProgress?.(90, 'Đang gắn file vào thư mục...');
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

  onProgress?.(96, 'Đang thiết lập quyền truy cập...');
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

  onProgress?.(100, 'Tải lên hoàn tất');

  return {
    id: fileId,
    url: `/api/files/preview/${fileId}`,
    fileName,
    mediaType,
    folderPath,
  };
};

const uploadFileToFolder = async (file, accessToken, folderId) => {
  const created = await uploadToGoogleDriveWithProgress(file, accessToken, () => {});
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
    throw new Error(`Google Drive folder move failed: ${await moveResponse.text()}`);
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
    throw new Error(`Google Drive permission failed: ${await permResponse.text()}`);
  }

  return { id: fileId, url: `/api/files/preview/${fileId}` };
};

export const fileApi = {
  /**
   * Resolve Drive folder path once, returns accessToken + folderId for reuse
   */
  resolveDriveFolder: async (mediaType, module, testTitle, testId, options = {}) => {
    const config = await getDriveUploadConfig(mediaType, module, testTitle, testId, options);
    const folderId = await resolveFolderPathSegments(config.accessToken, config.rootFolderId, config.folderPath);
    return { accessToken: config.accessToken, folderId };
  },

  /**
   * Upload file to an already-resolved Drive folder (skip config + folder lookup)
   */
  uploadToFolder: async (file, accessToken, folderId) => {
    return uploadFileToFolder(file, accessToken, folderId);
  },

  /**
   * Upload file lên Google Drive
   * @param {File} file - File object từ input
   * @param {string} mediaType - AUDIO | IMAGE | VIDEO | DOCUMENT
   * @param {string} module - LISTENING | READING | WRITING | SPEAKING
   * @param {string} testTitle - Tên đề thi để tạo cấu trúc thư mục Drive
   * @returns {Promise<{id, url, fileName, mediaType}>}
   */
  uploadFile: async (file, mediaType, module, testTitle, testId, options = {}) => {
    return uploadDirectToGoogleDrive(file, mediaType, module, testTitle, testId, options);
  },

  /**
   * Upload audio cho Listening
   */
  uploadListeningAudio: async (file, testTitle, testId, options = {}) => {
    return fileApi.uploadFile(file, 'AUDIO', 'LISTENING', testTitle, testId, options);
  },

  /**
   * Upload image cho Reading/Writing
   */
  uploadImage: async (file, module = 'READING', testTitle, testId, options = {}) => {
    return fileApi.uploadFile(file, 'IMAGE', module, testTitle, testId, options);
  },

  /**
   * Upload audio cho Speaking
   */
  uploadSpeakingAudio: async (file, testTitle, testId, options = {}) => {
    const storedUser = getStoredUser();
    const classCode = options.classCode
      || storedUser?.classCode
      || storedUser?.class?.code
      || storedUser?.clazz?.code
      || storedUser?.currentClass?.code
      || storedUser?.activeClass?.code
      || storedUser?.classes?.[0]?.code
      || storedUser?.classes?.[0]?.classCode
      || 'GENERAL';
    const studentCode = options.studentCode
      || storedUser?.studentCode
      || storedUser?.candidateCode
      || storedUser?.code
      || storedUser?.id
      || storedUser?.username
      || 'UNKNOWN_STUDENT';

    return fileApi.uploadFile(file, 'AUDIO', 'SPEAKING', testTitle, testId, {
      ...options,
      classCode,
      skillName: options.skillName || 'SPEAKING',
      testCode: options.testCode || testTitle || (testId != null ? `TEST_${testId}` : null),
      studentCode,
    });
  },

  /**
   * Upload tài liệu cho Writing
   */
  uploadWritingDocument: async (file, testTitle, testId, options = {}) => {
    const storedUser = getStoredUser();
    const classCode = options.classCode
      || storedUser?.classCode
      || storedUser?.class?.code
      || storedUser?.clazz?.code
      || storedUser?.currentClass?.code
      || storedUser?.activeClass?.code
      || storedUser?.classes?.[0]?.code
      || storedUser?.classes?.[0]?.classCode
      || 'GENERAL';
    const studentCode = options.studentCode
      || storedUser?.studentCode
      || storedUser?.candidateCode
      || storedUser?.code
      || storedUser?.id
      || storedUser?.username
      || 'UNKNOWN_STUDENT';

    return fileApi.uploadFile(file, 'DOCUMENT', 'WRITING', testTitle, testId, {
      ...options,
      classCode,
      skillName: options.skillName || 'WRITING',
      testCode: options.testCode || testTitle || (testId != null ? `TEST_${testId}` : null),
      studentCode,
    });
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
