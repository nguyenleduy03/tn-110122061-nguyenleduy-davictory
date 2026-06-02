<script setup>
import { ref, computed } from 'vue'
import { getResult, approve, rejectResult } from '../api/grading'
import StatusBadge from '../components/StatusBadge.vue'
import BandBadge from '../components/BandBadge.vue'
import CriteriaCard from '../components/CriteriaCard.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const searchForm = ref({
  submissionId: '',
  status: ''
})

const loading = ref(false)
const searching = ref(false)
const error = ref('')
const result = ref(null)
const showApproveBox = ref(false)
const approveForm = ref({ adjustments: '', reason: '' })
const actionLoading = ref(false)
const actionMsg = ref('')

const confirmDialog = ref({ show: false, title: '', message: '', danger: false, action: null })

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'FAILED', label: 'Thất bại' }
]

const criteriaLabels = {
  taskResponse: 'Task Response',
  coherenceCohesion: 'Coherence & Cohesion',
  lexicalResource: 'Lexical Resource',
  grammaticalRange: 'Gram. Range & Accuracy'
}

async function handleSearch() {
  const id = parseInt(searchForm.value.submissionId)
  if (!id) {
    error.value = 'Vui lòng nhập Submission ID'
    return
  }
  searching.value = true
  error.value = ''
  result.value = null

  try {
    const res = await getResult(id)
    result.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    searching.value = false
  }
}

async function handleApprove() {
  actionLoading.value = true
  actionMsg.value = ''
  try {
    const res = await approve(
      result.value.submissionId,
      approveForm.value.adjustments || null,
      approveForm.value.reason || 'Approved by admin'
    )
    result.value = { ...result.value, ...res.data, status: 'APPROVED' }
    actionMsg.value = 'Đã duyệt thành công'
    showApproveBox.value = false
  } catch (e) {
    actionMsg.value = 'Lỗi: ' + e.message
  } finally {
    actionLoading.value = false
  }
}

async function handleReject() {
  confirmDialog.value = {
    show: true,
    title: 'Từ chối kết quả',
    message: `Bạn có chắc muốn từ chối kết quả chấm cho submission #${result.value.submissionId}?`,
    danger: true,
    action: async () => {
      actionLoading.value = true
      try {
        await rejectResult(result.value.submissionId, 'Rejected by admin')
        result.value = { ...result.value, status: 'REJECTED' }
        actionMsg.value = 'Đã từ chối'
      } catch (e) {
        actionMsg.value = 'Lỗi: ' + e.message
      } finally {
        actionLoading.value = false
        confirmDialog.value.show = false
      }
    }
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Lịch sử chấm</h1>
    <p class="page-subtitle">Tra cứu và quản lý kết quả chấm điểm</p>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="searchForm.submissionId"
          type="number"
          class="search-input"
          placeholder="Nhập Submission ID..."
          @keyup.enter="handleSearch"
        />
        <button class="btn btn-primary" :disabled="searching" @click="handleSearch">
          {{ searching ? 'Đang tìm...' : 'Tìm kiếm' }}
        </button>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <LoadingSpinner v-if="searching" text="Đang tra cứu..." />

      <div v-else-if="result?.status === 'NOT_GRADED'" class="alert alert-info">
        Submission #{{ result.submissionId }} chưa được chấm.
      </div>

      <div v-else-if="result?.overallBand != null" class="result-section">
        <div class="result-header">
          <div style="display:flex;align-items:center;gap:12px">
            <StatusBadge :status="result.status || 'COMPLETED'" />
            <span class="meta-text">Submission #{{ result.submissionId }}</span>
          </div>
          <span class="meta-text">Confidence: {{ (result.confidenceScore * 100).toFixed(0) }}%</span>
        </div>

        <div class="overall-band">
          <div class="ob-label">Overall Band Score</div>
          <div class="ob-value">{{ result.overallBand?.toFixed(1) || '-' }}</div>
        </div>

        <div class="criteria-grid">
          <CriteriaCard
            v-for="(label, key) in criteriaLabels"
            :key="key"
            :name="label"
            :band="result[key]?.band"
            :strengths="result[key]?.strengths || []"
            :weaknesses="result[key]?.weaknesses || []"
          />
        </div>

        <div v-if="result.overallFeedback" class="feedback-box">
          <strong>Nhận xét:</strong>
          <p>{{ result.overallFeedback }}</p>
        </div>

        <div v-if="actionMsg" class="alert alert-success" style="margin-top:12px">{{ actionMsg }}</div>

        <div v-if="result.status === 'COMPLETED'" style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-success" @click="showApproveBox = !showApproveBox">
            {{ showApproveBox ? 'Đóng' : 'Duyệt' }}
          </button>
          <button class="btn btn-danger" @click="handleReject">Từ chối</button>
        </div>

        <div v-if="showApproveBox" style="margin-top:16px;padding:16px;background:#fafbfc;border-radius:8px;border:1px solid var(--border)">
          <div class="form-group">
            <label>Ghi chú duyệt</label>
            <textarea v-model="approveForm.adjustments" rows="2" placeholder="Nhập điều chỉnh nếu có..."></textarea>
          </div>
          <button class="btn btn-success" :disabled="actionLoading" @click="handleApprove">
            {{ actionLoading ? 'Đang xử lý...' : 'Xác nhận duyệt' }}
          </button>
        </div>
      </div>

      <div v-else-if="!searching && !error" class="empty-state">
        <div class="empty-icon">&#128269;</div>
        <div class="empty-text">Nhập Submission ID để tra cứu kết quả chấm</div>
      </div>
    </div>

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
