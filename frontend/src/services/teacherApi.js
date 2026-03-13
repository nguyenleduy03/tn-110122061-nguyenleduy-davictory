import apiClient from './authApi';

export const teacherApi = {
  getWritingSubmissions: async (params = {}) => {
    const res = await apiClient.get('/writing/submissions', { params });
    return res.data;
  },
  getWritingSubmission: async (submissionId) => {
    const res = await apiClient.get(`/writing/submissions/${submissionId}`);
    return res.data;
  },
};
