import axios from 'axios';

const speakingBase = '/api/ai/speaking';
const speakingAdminBase = '/api/admin/speaking';

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
      },
    });
  },

  generateQuestion(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/question`);
  },

  submitAnswer(sessionId, answerText, durationMs) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/answer`, {
      answer_text: answerText,
      duration_ms: durationMs,
    });
  },

  submitAudio(sessionId, audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile);
    return axios.post(`${speakingBase}/sessions/${sessionId}/audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  nextPhase(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/next-phase`);
  },

  endSession(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/end`);
  },

  getSession(sessionId) {
    return axios.get(`${speakingBase}/sessions/${sessionId}`);
  },

  evaluateSession(sessionId, userId = 1) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/evaluate`, null, {
      headers: { 'X-User-Id': String(userId) },
    });
  },

  tts(text, voice = 'alloy') {
    return axios.post(`${speakingBase}/tts`, { text, voice }, {
      responseType: 'blob',
    });
  },

  scoreEvaluate(sessionId, userId = 1) {
    return axios.post(`${speakingBase}/scoring/evaluate/${sessionId}`, null, {
      headers: { 'X-User-Id': String(userId) },
    });
  },

  scoreResult(sessionId) {
    return axios.get(`${speakingBase}/scoring/result/${sessionId}`);
  },

  getConfig() {
    return axios.get(`${speakingAdminBase}/config`);
  },

  getRubric() {
    return axios.get(`${speakingAdminBase}/rubric`);
  },

  getCacheStats() {
    return axios.get(`${speakingAdminBase}/cache/stats`);
  },

  clearCache() {
    return axios.post(`${speakingAdminBase}/cache/clear`);
  },
};
