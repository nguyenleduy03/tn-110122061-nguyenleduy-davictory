import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  } catch {
    return null;
  }
};

const aiImportApi = {
  parseDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('ai/import/parse', formData, {
      baseURL: API_CONFIG.BASE_URL,
      timeout: 180000,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders(),
      },
    });
  },

  structureDocument(taskId, text, skillHint = '', testType = 'ACADEMIC') {
    return api.post('ai/import/structure', {
      task_id: taskId,
      text: text,
      skill_hint: skillHint,
      test_type: testType,
    }, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      timeout: 180000,
    });
  },

  createTest(taskId, title, testType, sections, createdByUserId = null, targetBand = '7.0') {
    return api.post('ai/import/create', {
      task_id: taskId,
      taskId,
      test_type: testType,
      title,
      target_band: targetBand,
      created_by_user_id: createdByUserId || getCurrentUserId() || 1,
      sections,
    }, {
      headers: getAuthHeaders(),
    });
  },

  getStatus(taskId) {
    return api.get(`ai/import/status/${taskId}`, {
      headers: getAuthHeaders(),
    });
  },
};

export default aiImportApi;
