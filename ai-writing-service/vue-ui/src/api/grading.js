import api from './index'

export function testGrade({ essayText, taskType, topic }) {
  return api.post('/ai/writing/test-grade', { essayText, taskType, topic })
}

export function gradeSingle(submissionId, userId = 'admin', role = 'admin') {
  return api.post(`/ai/writing/grade/${submissionId}`, null, {
    headers: { 'X-User-Id': userId, 'X-User-Role': role }
  })
}

export function getResult(submissionId) {
  return api.get(`/ai/writing/result/${submissionId}`)
}

export function approve(submissionId, adjustments, reason) {
  return api.post(`/ai/writing/approve/${submissionId}`, { adjustments, reason }, {
    headers: { 'X-User-Id': '1' }
  })
}

export function rejectResult(submissionId, reason) {
  return api.post(`/ai/writing/reject/${submissionId}`, { reason })
}

export function batchGrade(submissionIds, userId = 'admin') {
  return api.post('/ai/writing/batch', { submissionIds }, {
    headers: { 'X-User-Id': userId }
  })
}

export function getBatchStatus(batchId) {
  return api.get(`/ai/writing/batch/${batchId}`)
}
