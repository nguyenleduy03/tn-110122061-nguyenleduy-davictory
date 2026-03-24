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
    const [writingResult, examResult] = await Promise.allSettled([
      apiClient.get('/writing/teacher/submissions', { params }),
      apiClient.get('/exam-attempts')
    ]);

    const writingSubmissions = writingResult.status === 'fulfilled'
      ? (Array.isArray(writingResult.value.data) ? writingResult.value.data : [])
      : [];

    let examAttempts = [];
    if (examResult.status === 'fulfilled') {
      const examData = examResult.value.data;
      if (Array.isArray(examData)) {
        examAttempts = examData.map((a) => ({
          ...a,
          examType: a.examType || a.skillType || 'EXAM',
          examTitle: a.examTitle || a.testTitle || 'N/A'
        }));
      } else if (examData && Array.isArray(examData.examAttempts)) {
        examAttempts = examData.examAttempts;
      }
    }

    if (writingResult.status === 'rejected' && examResult.status === 'rejected') {
      throw writingResult.reason || examResult.reason;
    }

    return {
      writingSubmissions,
      examAttempts
    };
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
