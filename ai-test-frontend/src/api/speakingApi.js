import axios from 'axios';

const speakingBase = '/api/ai/speaking';
const speakingAdminBase = '/api/admin/speaking';

export const speakingApi = {
  createSession(config = {}, userId = 1, userName = 'Test User', userRole = 'STUDENT') {
    return axios.post(`${speakingBase}/sessions`, {
      targetLanguage: 'english',
      scenario: 'ielts_speaking',
      focusArea: 'part1',
      topic: 'random_topics',
      currentLevel: 'band_6',
      targetLevel: 'band_7',
      practiceMode: 'mock_test',
      aiRole: 'examiner',
      responseStyle: 'formal',
      voiceAccent: 'female_uk',
      feedbackLanguage: 'english',
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
      answerText,
      durationMs,
    });
  },

  submitAudio(sessionId, audioFile) {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return axios.post(`${speakingBase}/sessions/${sessionId}/audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  followUp(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/follow-up`);
  },

  nextPhase(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/next-phase`);
  },

  endPart(sessionId) {
    return axios.post(`${speakingBase}/sessions/${sessionId}/end-part`);
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
    return axios.get(`${speakingBase}/tts`, {
      params: { text, voice },
      responseType: 'blob',
    });
  },

  // Scoring
  scoreEvaluate(sessionId, userId = 1) {
    return axios.post(`${speakingBase}/scoring/evaluate/${sessionId}`, null, {
      headers: { 'X-User-Id': String(userId) },
    });
  },

  scoreResult(sessionId) {
    return axios.get(`${speakingBase}/scoring/result/${sessionId}`);
  },

  // Admin
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

  resetQuota() {
    return axios.post(`${speakingAdminBase}/quota/reset`);
  },
};
