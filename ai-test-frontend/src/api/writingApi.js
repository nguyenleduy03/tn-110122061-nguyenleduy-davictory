import axios from 'axios';

const writingBase = '/api/ai/writing';
const writingAdminBase = '/api/admin/ai';

export const writingApi = {
  gradeSubmission(submissionId, userId = 'test', role = 'TEACHER') {
    return axios.post(`${writingBase}/grade/${submissionId}`, null, {
      headers: { 'X-User-Id': userId, 'X-User-Role': role },
    });
  },

  testGrade(essayText, taskType = 'TASK2_ACADEMIC', topic = 'Education') {
    return axios.post(`${writingBase}/test-grade`, { essayText, taskType, topic });
  },

  startBatch(submissionIds, userId = 'test') {
    return axios.post(`${writingBase}/batch`, { submissionIds }, {
      headers: { 'X-User-Id': userId },
    });
  },

  getBatchStatus(batchId) {
    return axios.get(`${writingBase}/batch/${batchId}`);
  },

  getResult(submissionId) {
    return axios.get(`${writingBase}/result/${submissionId}`);
  },

  approve(submissionId, adjustments, reason, userId = 1) {
    return axios.post(`${writingBase}/approve/${submissionId}`, 
      { adjustments, reason },
      { headers: { 'X-User-Id': String(userId) } }
    );
  },

  reject(submissionId, reason) {
    return axios.post(`${writingBase}/reject/${submissionId}`, { reason });
  },

  // Admin
  getSamplesCount() {
    return axios.get(`${writingAdminBase}/samples/count`);
  },

  addSample(data) {
    return axios.post(`${writingAdminBase}/samples`, data);
  },

  getConfig() {
    return axios.get(`${writingAdminBase}/config`);
  },

  getStats() {
    return axios.get(`${writingAdminBase}/stats`);
  },

  reindex() {
    return axios.post(`${writingAdminBase}/reindex`);
  },

  clearCache() {
    return axios.post(`${writingAdminBase}/cache/clear`);
  },

  getModels() {
    return axios.get(`${writingAdminBase}/models`);
  },

  switchModel(model) {
    return axios.post(`${writingAdminBase}/model`, { model });
  },

  getEvaluationAccuracy() {
    return axios.get('/api/ai/evaluation/accuracy');
  },

  getEvaluationStats() {
    return axios.get('/api/ai/evaluation/stats');
  },
};
