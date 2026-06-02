<script setup>
import { ref, onMounted, computed } from 'vue'
import { getConfig, getAdminStats, reindex, clearCache, getModels, switchModel } from '../api/admin'
import { getSampleCount } from '../api/admin'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const loading = ref(true)
const error = ref('')
const msg = ref('')
const config = ref({})
const adminStats = ref({})
const sampleInfo = ref({})

const actionLoading = ref('')
const confirmDialog = ref({ show: false, title: '', message: '', danger: false, action: null })

const modelList = ref([])
const currentModel = ref('')
const switching = ref(false)

const currentModelInfo = computed(() =>
  modelList.value.find(m => m.model === currentModel.value)
)

onMounted(async () => {
  try {
    const [configRes, statsRes, sampleRes, modelRes] = await Promise.all([
      getConfig().catch(() => ({ data: {} })),
      getAdminStats().catch(() => ({ data: {} })),
      getSampleCount().catch(() => ({ data: {} })),
      getModels().catch(() => ({ data: { models: [], current: '' } }))
    ])
    config.value = configRes.data
    adminStats.value = statsRes.data
    sampleInfo.value = sampleRes.data
    modelList.value = modelRes.data.models || []
    currentModel.value = modelRes.data.current || configRes.data.model || ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function handleSwitchModel(model) {
  if (model === currentModel.value) return
  switching.value = true
  error.value = ''
  try {
    const res = await switchModel(model)
    currentModel.value = res.data.model
    config.value.model = res.data.model
    config.value.provider = res.data.provider
    msg.value = `Switch model thành công → ${res.data.model}`
  } catch (e) {
    error.value = e.message
  } finally {
    switching.value = false
  }
}

function triggerReindex() {
  confirmDialog.value = {
    show: true,
    title: 'Re-index Vector Store',
    message: 'Thao tác này sẽ index lại toàn bộ bài mẫu. Tiếp tục?',
    danger: false,
    action: async () => {
      actionLoading.value = 'reindex'
      try {
        const res = await reindex()
        msg.value = `Re-index: ${res.data.status}`
        const sc = await getSampleCount()
        sampleInfo.value = sc.data
      } catch (e) {
        error.value = e.message
      } finally {
        actionLoading.value = ''
        confirmDialog.value.show = false
      }
    }
  }
}

function triggerClearCache() {
  confirmDialog.value = {
    show: true,
    title: 'Xóa Cache',
    message: 'Xóa toàn bộ cache kết quả chấm?',
    danger: true,
    action: async () => {
      actionLoading.value = 'cache'
      try {
        const res = await clearCache()
        msg.value = `Cache: ${res.data.status}`
      } catch (e) {
        error.value = e.message
      } finally {
        actionLoading.value = ''
        confirmDialog.value.show = false
      }
    }
  }
}

function getQuotaInfo() {
  if (!config.value.quota) return []
  return Object.entries(config.value.quota).map(([role, limit]) => `${role}: ${limit}/ngày`)
}
</script>

<template>
  <div>
    <h1 class="page-title">Cấu hình</h1>
    <p class="page-subtitle">Thông tin cấu hình và trạng thái hệ thống</p>

    <LoadingSpinner v-if="loading" text="Đang tải..." />

    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <template v-else>
      <div v-if="msg" class="alert alert-success">{{ msg }}</div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Provider</div>
          <div class="stat-value" style="font-size:1.2rem">{{ config.provider || '-' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Model</div>
          <div class="stat-value" style="font-size:1.2rem">{{ config.model || '-' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Bài mẫu DB</div>
          <div class="stat-value">{{ sampleInfo.dbCount || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Vector Store</div>
          <div class="stat-value" :style="{ color: sampleInfo.vectorStoreIndexed ? 'var(--success)' : 'var(--danger)' }">
            {{ sampleInfo.vectorStoreIndexed ? 'ON' : 'OFF' }}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:16px">AI Model</div>
        <div style="margin-bottom:12px;color:var(--text-secondary);font-size:0.9rem">
          Đang dùng: <strong>{{ currentModelInfo?.label || currentModel || '-' }}</strong>
          <span v-if="currentModelInfo" class="meta-text" style="margin-left:8px">
            ({{ currentModelInfo.provider }})
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button
            v-for="m in modelList"
            :key="m.model"
            class="btn"
            :class="m.model === currentModel ? 'btn-primary' : 'btn-outline'"
            :disabled="switching || m.model === currentModel"
            @click="handleSwitchModel(m.model)"
            style="flex:1;min-width:160px;text-align:center;padding:10px 12px;font-size:0.85rem"
          >
            <div style="font-weight:600">{{ m.label }}</div>
            <div style="font-size:0.75rem;opacity:0.7;margin-top:2px">{{ m.model }}</div>
          </button>
        </div>
        <div v-if="switching" style="margin-top:10px;color:var(--primary);font-size:0.85rem">
          Đang chuyển model...
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:16px">Tính năng</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span
            v-for="(enabled, feature) in config.features"
            :key="feature"
            class="badge"
            :class="enabled ? 'badge-success' : 'badge-danger'"
          >
            {{ feature }}: {{ enabled ? 'ON' : 'OFF' }}
          </span>
          <span v-if="!config.features || !Object.keys(config.features).length" class="meta-text">
            Không có dữ liệu
          </span>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:16px">Quota</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span v-for="q in getQuotaInfo()" :key="q" class="tag">{{ q }}</span>
          <span v-if="!getQuotaInfo().length" class="meta-text">Không có dữ liệu</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px" v-if="adminStats.cache">
        <div class="card-title" style="margin-bottom:16px">Cache Statistics</div>
        <div class="stats-grid" style="margin-bottom:0">
          <div class="stat-card">
            <div class="stat-label">Hits</div>
            <div class="stat-value" style="font-size:1.3rem">{{ adminStats.cache.hits || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Misses</div>
            <div class="stat-value" style="font-size:1.3rem">{{ adminStats.cache.misses || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Hit Rate</div>
            <div class="stat-value" style="font-size:1.3rem">{{ (adminStats.cache.hitRate || 0).toFixed(1) }}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Evictions</div>
            <div class="stat-value" style="font-size:1.3rem">{{ adminStats.cache.evictions || 0 }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Hành động</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button
            class="btn btn-warning"
            :disabled="actionLoading === 'reindex'"
            @click="triggerReindex"
          >
            {{ actionLoading === 'reindex' ? 'Đang re-index...' : 'Re-index Vector Store' }}
          </button>
          <button
            class="btn btn-danger"
            :disabled="actionLoading === 'cache'"
            @click="triggerClearCache"
          >
            {{ actionLoading === 'cache' ? 'Đang xóa...' : 'Xóa Cache' }}
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
