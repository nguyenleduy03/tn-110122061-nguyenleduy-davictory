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

export const classApi = {
  getMyClasses: async () => {
    const res = await apiClient.get('/classes/my-classes');
    return res.data;
  },

  getClassById: async (id) => {
    const res = await apiClient.get(`/classes/${id}`);
    return res.data;
  },

  getClassStudents: async (classId) => {
    const res = await apiClient.get(`/classes/${classId}/students`);
    return res.data;
  },
};
