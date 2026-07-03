import axios from 'axios';

const writingBase = '/api/ai/writing';
const writingAdminBase = '/api/admin/ai';
const backendBase = '/api/writing';

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const userHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    headers['X-User-Id'] = String(user.id || 'test');
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const role = roles[0] || 'TEACHER';
    headers['X-User-Role'] = typeof role === 'string' ? role : (role.name || 'TEACHER');
  } catch {}
  return headers;
};

export const writingApi = {
  gradeSubmission(submissionId, userId = 'test', role = 'TEACHER') {
    return axios.post(`${writingBase}/grade/${submissionId}`, null, {
      headers: { 'X-User-Id': userId, 'X-User-Role': role, ...authHeaders() },
    });
  },

  testGrade(essayText, taskType = 'TASK2_ACADEMIC', topic = 'Education',
            promptText = '', chartType = '', essayType = '', letterType = '',
            imageUrl = '') {
    return axios.post(`${writingBase}/test-grade`, {
      essayText, taskType, topic, promptText,
      chartType, essayType, letterType, imageUrl,
    }, { headers: authHeaders() });
  },

  describeImage(imageUrl) {
    return axios.post(`${writingBase}/describe-image`, { imageUrl }, {
      headers: authHeaders(),
    });
  },

  classify(essayText, promptText = '') {
    return axios.post(`${writingBase}/classify`, { essayText, promptText }, {
      headers: authHeaders(),
    });
  },

  startBatch(submissionIds, userId = 'test') {
    return axios.post(`${writingBase}/batch`, { submission_ids: submissionIds }, {
      headers: { 'X-User-Id': userId, ...authHeaders() },
    });
  },

  getBatchStatus(batchId) {
    return axios.get(`${writingBase}/batch/${batchId}`, { headers: authHeaders() });
  },

  getResult(submissionId) {
    return axios.get(`${writingBase}/result/${submissionId}`, { headers: authHeaders() });
  },

  approve(submissionId, adjustments, reason, userId = 1) {
    return axios.post(`${writingBase}/approve/${submissionId}`,
      { adjustments, reason },
      { headers: { 'X-User-Id': String(userId), ...authHeaders() } }
    );
  },

  reject(submissionId, reason) {
    return axios.post(`${writingBase}/reject/${submissionId}`, { reason }, {
      headers: authHeaders(),
    });
  },

  getSamples(page = 0, size = 20) {
    return axios.get(`${writingAdminBase}/samples`, {
      params: { page, size },
      headers: authHeaders(),
    });
  },

  getSamplesCount() {
    return axios.get(`${writingAdminBase}/samples/count`, { headers: authHeaders() });
  },

  addSample(data) {
    return axios.post(`${writingAdminBase}/samples`, data, { headers: authHeaders() });
  },

  getConfig(taskType) {
    const params = taskType ? { task_type: taskType } : {};
    return axios.get(`${writingAdminBase}/config`, { params, headers: authHeaders() });
  },

  getStats() {
    return axios.get(`${writingAdminBase}/stats`, { headers: authHeaders() });
  },

  reindex() {
    return axios.post(`${writingAdminBase}/reindex`, null, { headers: authHeaders() });
  },

  clearCache() {
    return axios.post(`${writingAdminBase}/cache/clear`, null, { headers: authHeaders() });
  },

  getModels() {
    return axios.get(`${writingAdminBase}/models`, { headers: authHeaders() });
  },

  switchModel(model) {
    return axios.post(`${writingAdminBase}/model`, { model }, { headers: authHeaders() });
  },

  getEvaluationAccuracy() {
    return axios.get('/api/ai/evaluation/accuracy', { headers: authHeaders() });
  },

  getEvaluationStats() {
    return axios.get('/api/ai/evaluation/stats', { headers: authHeaders() });
  },

  matchSamples(essayText, taskType = 'TASK2_ACADEMIC') {
    return axios.post(`${writingBase}/match-samples`, {
      essay_text: essayText, task_type: taskType,
    }, { headers: authHeaders() });
  },

  getTestFull(testId) {
    return axios.get(`/api/test-builder/${testId}/full`, { headers: authHeaders() });
  },

  saveAiGradingHistory(data) {
    return axios.post(`${backendBase}/ai-grade/history`, data, { headers: authHeaders() });
  },

  getAiGradingHistory(userId) {
    const params = userId ? { userId } : {};
    return axios.get(`${backendBase}/ai-grade/history`, { params, headers: authHeaders() });
  },

  getAiGradingStats() {
    return axios.get(`${backendBase}/ai-grade/stats`, { headers: authHeaders() });
  },

  getHomeStats() {
    return axios.get(`${backendBase}/ai-grade/home-stats`, { headers: authHeaders() });
  },
};
