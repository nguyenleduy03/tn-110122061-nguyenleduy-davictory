import axios from 'axios';

const speakingBase = '/api/ai/speaking';
const speakingAdminBase = '/api/admin/speaking';

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const userHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    headers['X-User-Id'] = String(user.id || 1);
    headers['X-User-Name'] = user.fullName || user.username || 'Test User';
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const role = roles[0] || 'STUDENT';
    headers['X-User-Role'] = typeof role === 'string' ? role : (role.name || 'STUDENT');
  } catch {}
  return headers;
};

export const speakingApi = {
  createSession(config = {}, userId = 1, userName = 'Test User', userRole = 'STUDENT') {
    return axios.post(`${speakingBase}/sessions`, {
      topic: config.topic || '',
      focus_area: config.focusArea || 'general',
      practice_mode: config.practiceMode || 'mock_test',
      ...config,
    }, {
      headers: {
        'X-User-Id': String(userId),
        'X-User-Name': userName,
        'X-User-Role': userRole,
        ...authHeaders(),
      },
    });
  },

  generateQuestion(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/question`, null, {
      headers: authHeaders(),
    });
  },

  submitAnswer(sessionId, answerText, durationMs) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/answer`, {
      answer_text: answerText,
      duration_ms: durationMs,
    }, { headers: authHeaders() });
  },

  submitAudio(sessionId, audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile);
    return axios.post(`${speakingBase}/sessions/${sessionId}/audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
    });
  },

  nextPhase(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/next-phase`, null, {
      headers: authHeaders(),
    });
  },

  endSession(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/end`, null, {
      headers: authHeaders(),
    });
  },

  getSession(sessionId) {
    return axios.get(`${speakingBase}/sessions/${sessionId}`, { headers: authHeaders() });
  },

  evaluateSession(sessionId, userId = 1) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/evaluate`, null, {
      headers: { 'X-User-Id': String(userId), ...authHeaders() },
    });
  },

  tts(text, voice = 'alloy') {
    return axios.post(`${speakingBase}/tts`, { text, voice }, {
      responseType: 'blob',
      headers: authHeaders(),
    });
  },

  scoreEvaluate(sessionId, userId = 1) {
    return axios.post(`${speakingBase}/scoring/evaluate/${sessionId}`, null, {
      headers: { 'X-User-Id': String(userId), ...authHeaders() },
    });
  },

  scoreResult(sessionId) {
    return axios.get(`${speakingBase}/scoring/result/${sessionId}`, { headers: authHeaders() });
  },

  getConfig() {
    return axios.get(`${speakingAdminBase}/config`, { headers: authHeaders() });
  },

  getRubric() {
    return axios.get(`${speakingAdminBase}/rubric`, { headers: authHeaders() });
  },

  getCacheStats() {
    return axios.get(`${speakingAdminBase}/cache/stats`, { headers: authHeaders() });
  },

  clearCache() {
    return axios.post(`${speakingAdminBase}/cache/clear`, null, { headers: authHeaders() });
  },

  gradeExam(questions, files) {
    const formData = new FormData();
    formData.append('questions', JSON.stringify(questions));
    files.forEach((f) => formData.append('files', f));
    return axios.post(`${speakingBase}/exam-grade`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
    });
  },

  getMyClasses() {
    return axios.get(`/api/class-management/my`, { headers: authHeaders() });
  },

  getAttemptsByClass(classId) {
    return axios.get(`/api/exam-attempts/class/${classId}`, { headers: authHeaders() });
  },

  getSpeakingAttempt(attemptId) {
    return axios.get(`/api/speaking/attempts/${attemptId}`, { headers: authHeaders() });
  },

  getSpeakingSnapshot(attemptId) {
    return axios.get(`/api/speaking-gen/snapshot/${attemptId}`, { headers: authHeaders() });
  },

  filterAttempts(filterData) {
    return axios.post('/api/exam-attempts/filter', filterData, { headers: authHeaders() });
  },

  analyzePronunciation(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/pronunciation`, null, {
      headers: authHeaders(),
    });
  },

  scoreSession(sessionId, userId = 1) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/score`, null, {
      headers: { 'X-User-Id': String(userId), ...authHeaders() },
    });
  },

  getExamAttemptDetail(attemptId) {
    return axios.get(`/api/exam-attempts/${attemptId}/detail`, { headers: authHeaders() });
  },

  getTestFull(testId) {
    return axios.get(`/api/test-builder/${testId}/full`, { headers: authHeaders() });
  },

  downloadAudio(fileId) {
    return axios.get(`/api/files/preview/${fileId}`, {
      headers: { ...authHeaders() },
      responseType: 'blob',
    });
  },
};
