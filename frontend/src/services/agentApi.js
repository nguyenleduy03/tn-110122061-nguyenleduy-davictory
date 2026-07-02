import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const agentApi = {
  query(message, sessionId = null, agentMode = false, mode = 'auto', signal = null) {
    const body = { message, agent_mode: agentMode, mode };
    if (sessionId) body.session_id = sessionId;
    const config = {};
    if (signal) config.signal = signal;
    return api.post('/agent/query', body, config);
  },

  listAgents() {
    return api.get('/agent/agents');
  },

  getProgress(sessionId) {
    return api.get(`/agent/sessions/${sessionId}/progress`);
  },

  listPosts() {
    return api.get('/agent/posts-list');
  },

  getPost(id) {
    return api.get(`/agent/posts/${id}`);
  },

  deletePost(id) {
    return api.delete(`/agent/posts/${id}`);
  },

  publishPost(id) {
    return api.put(`/agent/posts/${id}/publish`);
  },

  getTasks(sessionId, sinceId = 0) {
    return api.get(`/agent/sessions/${sessionId}/tasks?since_id=${sinceId}`);
  },

  getPendingActions() {
    return api.get('/agent/actions/pending');
  },

  approveAction(id, reason = '') {
    return api.post(`/agent/actions/${id}/approve`, { reason });
  },

  rejectAction(id, reason = '') {
    return api.post(`/agent/actions/${id}/reject`, { reason });
  },

  // SSE streaming for agent results
  // Blog wizard endpoints
  startWizard(topic) {
    return api.post('/agent/posts/generate', { topic });
  },

  getWizardStatus(taskId) {
    return api.get(`/agent/posts/generate/${taskId}`);
  },

  confirmWizardOutline(taskId, action, outline = null) {
    const body = { action };
    if (outline) body.outline = outline;
    return api.post(`/agent/posts/generate/${taskId}/outline`, body);
  },

  improveWizardOutline(taskId, feedback) {
    return api.post(`/agent/posts/generate/${taskId}/outline/improve`, { feedback });
  },

  confirmWizardContent(taskId, action, contentHtml = null) {
    const body = { action };
    if (contentHtml) body.content_html = contentHtml;
    return api.post(`/agent/posts/generate/${taskId}/content`, body);
  },

  streamResults(sessionId, onEvent, onError, onDone) {
    const token = localStorage.getItem('authToken');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${API_CONFIG.BASE_URL}/agent/sessions/${sessionId}/stream`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'text';

    let lastIndex = 0;
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('event: ')) continue;
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            onEvent(data);
          } catch (e) { /* ignore */ }
        }
      }
    };
    xhr.onerror = () => onError?.('Lỗi kết nối');
    xhr.onloadend = () => onDone?.();
    xhr.send();
    return () => xhr.abort();
  },

  // Categories
  listCategories() {
    return api.get('/agent/categories');
  },
  createCategory(data) {
    return api.post('/agent/categories', data);
  },
  updateCategory(id, data) {
    return api.put(`/agent/categories/${id}`, data);
  },
  deleteCategory(id) {
    return api.delete(`/agent/categories/${id}`);
  },
  assignPostCategory(postId, categoryId) {
    return api.put(`/agent/posts/${postId}/category`, { category_id: categoryId });
  },

  // Report templates
  getReportTemplates() {
    return api.get('/agent/report/templates');
  },
  getReportTemplate(id) {
    return api.get(`/agent/report/templates/${id}`);
  },
  analyzeMetric(metricKey, metricValue, period, question) {
    return api.post('/agent/report/analyze-metric', {
      metric_key: metricKey,
      metric_value: metricValue,
      period: period,
      question: question
    });
  },
};

export default agentApi;
