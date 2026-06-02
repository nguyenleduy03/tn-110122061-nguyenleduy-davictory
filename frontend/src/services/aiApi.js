import api from '../config/api';

const aiApi = {
  gradeWriting(submissionId) {
    return api.post(`/writing/ai-grade/${submissionId}`);
  },

  getGradingResult(submissionId) {
    return api.get(`/writing/ai-grade/${submissionId}/result`);
  },

  gradeBatch(submissionIds) {
    return api.post('/writing/ai-grade/batch', { submissionIds });
  },

  approveGrade(submissionId, adjustments = null) {
    return api.post(`/writing/ai-grade/${submissionId}/approve`, { adjustments });
  },

  rejectGrade(submissionId, reason = '') {
    return api.post(`/writing/ai-grade/${submissionId}/reject`, { reason });
  },

  getInsights(userId) {
    return api.get(`/ai/student/${userId}/insights`);
  }
};

export default aiApi;
