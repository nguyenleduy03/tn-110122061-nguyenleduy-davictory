import api from './index'

export function getSampleCount() {
  return api.get('/admin/ai/samples/count')
}

export function addSample(data) {
  return api.post('/admin/ai/samples', data)
}

export function getConfig() {
  return api.get('/admin/ai/config')
}

export function getAdminStats() {
  return api.get('/admin/ai/stats')
}

export function reindex() {
  return api.post('/admin/ai/reindex')
}

export function clearCache() {
  return api.post('/admin/ai/cache/clear')
}

export function getModels() {
  return api.get('/admin/ai/models')
}

export function switchModel(model) {
  return api.post('/admin/ai/model', { model })
}

export async function addSamplesBulk(samples) {
  const results = []
  for (const sample of samples) {
    try {
      const res = await addSample(sample)
      results.push({ ...res.data, input: sample })
    } catch (e) {
      results.push({ status: 'error', error: e.message, input: sample })
    }
  }
  return results
}
