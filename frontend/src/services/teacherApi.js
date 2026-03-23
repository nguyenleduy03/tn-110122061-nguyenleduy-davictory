import axios from 'axios';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const teacherApi = {
  getWritingSubmissions: async (params = {}) => {
    const res = await apiClient.get('/writing/teacher/submissions', { params });
    return res.data;
  },

  getAllSubmissions: async (params = {}) => {
    const res = await apiClient.get('/writing/teacher/all-submissions', { params });
    return res.data;
  },

  getWritingSubmission: async (submissionId) => {
    const res = await apiClient.get(`/writing/teacher/submissions/${submissionId}`);
    return res.data;
  },

  getExamAttemptDetail: async (attemptId) => {
    const res = await apiClient.get(`/exam-attempts/${attemptId}/detail`);
    return res.data;
  },

  updateExamAttemptGrade: async (attemptId, payload) => {
    const res = await apiClient.put(`/exam-attempts/${attemptId}/grade`, payload);
    return res.data;
  },

  getExamAttemptGradeHistory: async (attemptId) => {
    const res = await apiClient.get(`/exam-attempts/${attemptId}/grade-history`);
    return res.data;
  },

  gradeWritingSubmission: async (submissionId, payload) => {
    const res = await apiClient.post(`/writing/${submissionId}/grade`, payload);
    return res.data;
  },

  getAssignments: async (params = {}) => {
    const res = await apiClient.get('/assignments', { params });
    return res.data;
  },
};
