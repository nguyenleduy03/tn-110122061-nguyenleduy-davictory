import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const fileApi = {
  /**
   * Upload file lên Google Drive
   * @param {File} file - File object từ input
   * @param {string} mediaType - AUDIO | IMAGE | VIDEO | DOCUMENT
   * @param {string} module - LISTENING | READING | WRITING | SPEAKING
   * @returns {Promise<{id, url, fileName, mediaType}>}
   */
  uploadFile: async (file, mediaType, module) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    formData.append('module', module);

    const response = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for large files
    });

    return response.data;
  },

  /**
   * Upload audio cho Listening
   */
  uploadListeningAudio: async (file) => {
    return fileApi.uploadFile(file, 'AUDIO', 'LISTENING');
  },

  /**
   * Upload image cho Reading/Writing
   */
  uploadImage: async (file, module = 'READING') => {
    return fileApi.uploadFile(file, 'IMAGE', module);
  },

  /**
   * Upload audio cho Speaking
   */
  uploadSpeakingAudio: async (file) => {
    return fileApi.uploadFile(file, 'AUDIO', 'SPEAKING');
  },

  /**
   * Delete file từ Google Drive
   */
  deleteFile: async (fileId) => {
    const response = await axios.delete(`${API_BASE_URL}/api/files/${fileId}`);
    return response.data;
  },
};

export default fileApi;
