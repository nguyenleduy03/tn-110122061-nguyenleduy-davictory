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

export const examApi = {
  create: async (data) => {
    const res = await apiClient.post('/exams', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/exams/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/exams/${id}`);
    return res.data;
  },

  start: async (id) => {
    const res = await apiClient.post(`/exams/${id}/start`);
    return res.data;
  },

  close: async (id) => {
    const res = await apiClient.post(`/exams/${id}/close`);
    return res.data;
  },

  getDetail: async (id) => {
    const res = await apiClient.get(`/exams/${id}`);
    return res.data;
  },

  listTeacherExams: async () => {
    const res = await apiClient.get('/exams');
    return res.data;
  },

  listAvailable: async () => {
    const res = await apiClient.get('/exams/available');
    return res.data;
  },

  verifyPassword: async (id, password) => {
    const res = await apiClient.post(`/exams/${id}/verify-password`, { password });
    return res.data;
  },

  checkAccess: async (id) => {
    const res = await apiClient.post(`/exams/${id}/check-access`);
    return res.data;
  },
};
