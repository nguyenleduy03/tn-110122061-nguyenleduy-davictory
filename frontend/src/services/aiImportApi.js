import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

const aiImportApi = {
  parseDocument(file, skillHint = '', testType = 'ACADEMIC') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('skillHint', skillHint);
    formData.append('testType', testType);
    return axios.post('/api/ai/import/parse', formData, {
      baseURL: API_CONFIG.BASE_URL,
      timeout: 180000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createTest(taskId, title, testType, sections, createdByUserId = 1) {
    return api.post('/ai/import/create', {
      taskId,
      test_type: testType,
      title,
      target_band: '7.0',
      created_by_user_id: createdByUserId,
      sections,
    });
  },

  getStatus(taskId) {
    return api.get(`/ai/import/status/${taskId}`);
  },
};

export default aiImportApi;
