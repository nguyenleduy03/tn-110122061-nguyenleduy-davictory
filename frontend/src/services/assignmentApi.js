import axios from 'axios';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const assignmentApi = {
  createAssignment: async (data) => {
    const res = await apiClient.post('/assignments', data);
    return res.data;
  },

  updateAssignment: async (id, data) => {
    const res = await apiClient.put(`/assignments/${id}`, data);
    return res.data;
  },

  deleteAssignment: async (id) => {
    await apiClient.delete(`/assignments/${id}`);
  },

  getAssignment: async (id) => {
    const res = await apiClient.get(`/assignments/${id}`);
    return res.data;
  },

  getAssignmentsByClass: async (classId) => {
    const res = await apiClient.get(`/assignments/class/${classId}`);
    return res.data;
  },

  getMyAssignments: async () => {
    const res = await apiClient.get('/assignments/my-assignments');
    return res.data;
  },

  getAssignmentsForStudent: async (classId) => {
    const res = await apiClient.get(`/assignments/student/class/${classId}`);
    return res.data;
  },

  // Student submissions
  getMySubmissions: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/my-submissions`);
    return res.data;
  },

  getMyLatestSubmission: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/my-submission`);
    return res.data;
  },

  submitManual: async (assignmentId, data) => {
    const res = await apiClient.post(`/assignments/${assignmentId}/submit-manual`, data);
    return res.data;
  },

  submitTest: async (assignmentId, examAttemptId) => {
    const res = await apiClient.post(`/assignments/${assignmentId}/submit-test`, { examAttemptId });
    return res.data;
  },

  getResult: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/result`);
    return res.data;
  },

  // Teacher grading
  getSubmissions: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/submissions`);
    return res.data;
  },

  getSubmissionById: async (submissionId) => {
    const res = await apiClient.get(`/assignments/submissions/${submissionId}`);
    return res.data;
  },

  gradeSubmission: async (submissionId, data) => {
    const res = await apiClient.post(`/assignments/submissions/${submissionId}/grade`, data);
    return res.data;
  },

  getPendingSubmissions: async (classId) => {
    const res = await apiClient.get(`/assignments/class/${classId}/pending`);
    return res.data;
  },

  // Legacy - keep for backward compatibility
  submitAssignment: async (data) => {
    const res = await apiClient.post('/assignments/submit', data);
    return res.data;
  },

  getMySubmission: async (assignmentId) => {
    return assignmentApi.getMyLatestSubmission(assignmentId);
  },
};
