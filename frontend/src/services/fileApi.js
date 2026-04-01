import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

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

    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 300000, // 5 minutes for large audio files
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024, // 100MB
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
