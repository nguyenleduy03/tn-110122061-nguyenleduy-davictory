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

  submitAssignment: async (data) => {
    const res = await apiClient.post('/assignments/submit', data);
    return res.data;
  },

  getSubmissions: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/submissions`);
    return res.data;
  },

  getMySubmission: async (assignmentId) => {
    const res = await apiClient.get(`/assignments/${assignmentId}/my-submission`);
    return res.data;
  },

  gradeSubmission: async (data) => {
    const res = await apiClient.post('/assignments/grade', data);
    return res.data;
  },

  getPendingSubmissions: async (classId) => {
    const res = await apiClient.get(`/assignments/class/${classId}/pending`);
    return res.data;
  },

  getMyTemplates: async () => {
    const res = await apiClient.get('/assignments/templates');
    return res.data;
  },

  createTemplateFromTest: async (testId, data) => {
    const res = await apiClient.post(`/assignments/from-test/${testId}`, data);
    return res.data;
  },
};
