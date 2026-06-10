import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

const aiApi = {
  gradeWriting(submissionId) {
    return api.post(`/writing/ai-grade/${submissionId}`);
  },

  getGradingResult(submissionId) {
    return api.get(`/writing/ai-grade/${submissionId}/result`);
  },

  testGradeWriting(essayText, taskType = 'TASK2_ACADEMIC', topic = '') {
    return api.post('/writing/ai-grade/test', {
      essayText: essayText.trim(),
      taskType,
      topic,
    });
  },

  gradeBatch(submissionIds) {
    return api.post('/writing/ai-grade/batch', { submissionIds });
  },

  approveGrade(submissionId, adjustments = null) {
    return api.post(`/writing/ai-grade/${submissionId}/approve`, { adjustments });
  },

  rejectGrade(submissionId, reason = '') {
    return api.post(`/writing/ai-grade/${submissionId}/reject`, { reason });
  },

  getInsights(userId) {
    return api.get(`/ai/student/${userId}/insights`);
  }
};

export default aiApi;
