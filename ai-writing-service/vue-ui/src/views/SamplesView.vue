<script setup>
import { ref, onMounted } from 'vue'
import { getSampleCount, addSample, addSamplesBulk, reindex, clearCache } from '../api/admin'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const loading = ref(true)
const sampleInfo = ref({})
const error = ref('')
const msg = ref('')

const singleForm = ref({
  taskType: 'TASK2_ACADEMIC',
  topic: '',
  promptText: '',
  essayText: '',
  bandScore: 6.0,
  examinerComment: '',
  sourceId: ''
})

const bulkJson = ref('')
const bulkResults = ref(null)
const importing = ref(false)

const reindexLoading = ref(false)
const cacheLoading = ref(false)

const confirmDialog = ref({ show: false, title: '', message: '', danger: false, action: null })

async function loadInfo() {
  loading.value = true
  try {
    const res = await getSampleCount()
    sampleInfo.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
    msg.value = ''
  }
}

onMounted(loadInfo)

async function handleAddSingle() {
  if (!singleForm.value.essayText.trim()) {
    error.value = 'Vui lòng nhập nội dung bài mẫu'
    return
  }
  importing.value = true
  error.value = ''
  msg.value = ''
  try {
    const res = await addSample({
      taskType: singleForm.value.taskType,
      topic: singleForm.value.topic || 'General',
      promptText: singleForm.value.promptText,
      essayText: singleForm.value.essayText,
      bandScore: singleForm.value.bandScore,
      examinerComment: singleForm.value.examinerComment,
      sourceId: singleForm.value.sourceId
    })
    msg.value = `Đã lưu: ${res.data.status}`
    if (res.data.status === 'saved') {
      singleForm.value = { ...singleForm.value, essayText: '', examinerComment: '', sourceId: '', promptText: '' }
    }
    await loadInfo()
  } catch (e) {
    error.value = e.message
  } finally {
    importing.value = false
  }
}

async function handleBulkImport() {
  if (!bulkJson.value.trim()) return
  let samples
  try {
    samples = JSON.parse(bulkJson.value)
    if (!Array.isArray(samples)) throw new Error('JSON phải là một mảng')
  } catch (e) {
    error.value = 'JSON không hợp lệ: ' + e.message
    return
  }

  importing.value = true
  error.value = ''
  msg.value = ''
  try {
    bulkResults.value = await addSamplesBulk(samples)
    msg.value = `Đã xử lý ${samples.length} mẫu`
    await loadInfo()
  } catch (e) {
    error.value = e.message
  } finally {
    importing.value = false
  }
}

async function handleReindex() {
  confirmDialog.value = {
    show: true,
    title: 'Re-index Vector Store',
    message: 'Thao tác này sẽ index lại toàn bộ bài mẫu vào vector store. Tiếp tục?',
    danger: false,
    action: async () => {
      reindexLoading.value = true
      msg.value = ''
      try {
        const res = await reindex()
        msg.value = `Re-index: ${res.data.status}`
        await loadInfo()
      } catch (e) {
        error.value = e.message
      } finally {
        reindexLoading.value = false
        confirmDialog.value.show = false
      }
    }
  }
}

async function handleClearCache() {
  confirmDialog.value = {
    show: true,
    title: 'Xóa Cache',
    message: 'Bạn có chắc muốn xóa toàn bộ cache kết quả chấm?',
    danger: true,
    action: async () => {
      cacheLoading.value = true
      try {
        const res = await clearCache()
        msg.value = `Cache: ${res.data.status}`
      } catch (e) {
        error.value = e.message
      } finally {
        cacheLoading.value = false
        confirmDialog.value.show = false
      }
    }
  }
}

const bulkStats = () => {
  if (!bulkResults.value) return ''
  const saved = bulkResults.value.filter(r => r.status === 'saved').length
  const dups = bulkResults.value.filter(r => r.status === 'duplicate').length
  const errs = bulkResults.value.filter(r => r.status === 'error').length
  return `Đã lưu: ${saved}, Trùng: ${dups}, Lỗi: ${errs}`
}
</script>

<template>
  <div>
    <h1 class="page-title">Quản lý bài mẫu</h1>
    <p class="page-subtitle">Thêm, nhập và quản lý bài mẫu cho RAG pipeline</p>

    <LoadingSpinner v-if="loading" text="Đang tải..." />

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Bài mẫu trong DB</div>
          <div class="stat-value">{{ sampleInfo.dbCount || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Vector Store</div>
          <div class="stat-value" :style="{ color: sampleInfo.vectorStoreIndexed ? 'var(--success)' : 'var(--danger)' }">
            {{ sampleInfo.vectorStoreIndexed ? 'ON' : 'OFF' }}
          </div>
        </div>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="msg" class="alert alert-success">{{ msg }}</div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Thêm bài mẫu</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Task Type</label>
            <select v-model="singleForm.taskType">
              <option value="TASK2_ACADEMIC">Task 2 - Academic</option>
              <option value="TASK1_ACADEMIC">Task 1 - Academic</option>
              <option value="TASK2_GENERAL">Task 2 - General</option>
              <option value="TASK1_GENERAL">Task 1 - General</option>
            </select>
          </div>
          <div class="form-group">
            <label>Chủ đề</label>
            <input v-model="singleForm.topic" type="text" placeholder="VD: Environment" />
          </div>
          <div class="form-group">
            <label>Band Score</label>
            <input v-model.number="singleForm.bandScore" type="number" step="0.5" min="0" max="9" />
          </div>
        </div>

        <div class="form-group">
          <label>Source ID (tránh trùng lặp)</label>
          <input v-model="singleForm.sourceId" type="text" placeholder="Để trống nếu không cần dedup" />
        </div>

        <div class="form-group">
          <label>Nội dung bài mẫu *</label>
          <textarea v-model="singleForm.essayText" rows="8" placeholder="Nhập nội dung bài mẫu..."></textarea>
        </div>

        <div class="form-group">
          <label>Nhận xét của giám khảo</label>
          <textarea v-model="singleForm.examinerComment" rows="2" placeholder="Nhận xét của examiner (nếu có)"></textarea>
        </div>

        <button class="btn btn-primary" :disabled="importing" @click="handleAddSingle">
          {{ importing ? 'Đang lưu...' : 'Thêm bài mẫu' }}
        </button>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Import hàng loạt (JSON)</span>
        </div>
        <div class="form-group">
          <textarea v-model="bulkJson" rows="8" placeholder='[{"taskType":"TASK2_ACADEMIC","topic":"Education","essayText":"...","bandScore":7.0}]'></textarea>
        </div>
        <button class="btn btn-primary" :disabled="importing" @click="handleBulkImport">
          {{ importing ? 'Đang import...' : 'Import JSON' }}
        </button>
        <div v-if="bulkResults" style="margin-top:12px;font-size:0.85rem;color:var(--text-secondary)">
          {{ bulkStats() }}
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Công cụ</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-warning" :disabled="reindexLoading" @click="handleReindex">
            {{ reindexLoading ? 'Đang re-index...' : 'Re-index Vector Store' }}
          </button>
          <button class="btn btn-danger" :disabled="cacheLoading" @click="handleClearCache">
            {{ cacheLoading ? 'Đang xóa...' : 'Xóa Cache' }}
          </button>
        </div>
      </div>
    </template>

    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :danger="confirmDialog.danger"
      confirm-text="Xác nhận"
      cancel-text="Hủy"
      @confirm="confirmDialog.action?.()"
      @cancel="confirmDialog.show = false"
    />
  </div>
</template>
