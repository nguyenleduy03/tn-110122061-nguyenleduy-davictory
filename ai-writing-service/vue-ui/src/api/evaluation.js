import api from './index'

export function getAccuracy() {
  return api.get('/ai/evaluation/accuracy')
}

export function getEvaluationStats() {
  return api.get('/ai/evaluation/stats')
}
