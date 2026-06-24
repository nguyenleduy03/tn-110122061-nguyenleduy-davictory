import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

const uploadApi = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'multipart/form-data' },
});

const speakingApi = {
  createSession(topic = '', parts = 'all', practiceMode = 'practice') {
    return api.post('/ai/speaking/test/session', {
      topic,
      focusArea: parts,
      practiceMode,
    });
  },

  getQuestion(sessionId) {
    return api.post(`/ai/speaking/test/${sessionId}/question`);
  },

  submitAnswer(sessionId, answerText, durationMs = 0) {
    return api.post(`/ai/speaking/test/${sessionId}/answer`, {
      answerText,
      durationMs,
    });
  },

  uploadAudio(sessionId, audioBlob, filename = 'recording.webm') {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    return uploadApi.post(`/ai/speaking/test/${sessionId}/audio`, formData);
  },

  evaluateSession(sessionId) {
    return api.post(`/ai/speaking/test/${sessionId}/evaluate`);
  },

  getResult(sessionId) {
    return api.get(`/ai/speaking/test/${sessionId}/result`);
  },

  getSession(sessionId) {
    return api.get(`/ai/speaking/test/${sessionId}`);
  },

  nextPhase(sessionId) {
    return api.post(`/ai/speaking/test/${sessionId}/next-phase`);
  },
};

export default speakingApi;
