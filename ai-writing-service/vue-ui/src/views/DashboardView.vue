<script setup>
import { ref, onMounted } from 'vue'
import StatsCard from '../components/StatsCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { getEvaluationStats } from '../api/evaluation'
import { getSampleCount } from '../api/admin'

const loading = ref(true)
const error = ref('')
const stats = ref({})
const sampleInfo = ref({})

onMounted(async () => {
  try {
    const [statsRes, sampleRes] = await Promise.all([
      getEvaluationStats().catch(() => ({ data: {} })),
      getSampleCount().catch(() => ({ data: {} }))
    ])
    stats.value = statsRes.data
    sampleInfo.value = sampleRes.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="page-title">Tổng quan</h1>
    <p class="page-subtitle">AI Writing Grading Service Dashboard</p>

    <LoadingSpinner v-if="loading" text="Đang tải dữ liệu..." />

    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <template v-else>
      <div class="stats-grid">
        <StatsCard label="Tổng bài đã chấm" :value="stats.totalGraded || 0" />
        <StatsCard label="Đã duyệt" :value="stats.approved || 0" />
        <StatsCard label="Từ chối" :value="stats.rejected || 0" />
        <StatsCard label="Tỉ lệ duyệt" :value="(stats.approvalRate || 0) + '%'" />
      </div>

      <div class="stats-grid">
        <StatsCard label="Thất bại" :value="stats.failed || 0" />
        <StatsCard label="Bài mẫu trong DB" :value="sampleInfo.dbCount || 0" />
        <StatsCard
          label="Vector Store"
          :value="sampleInfo.vectorStoreIndexed ? 'OK' : 'CHƯA INDEX'"
        />
        <StatsCard
          label="Providers"
          :value="Object.keys(stats.byProvider || {}).length || 0"
        />
      </div>

      <div v-if="stats.byProvider && Object.keys(stats.byProvider).length" class="card">
        <div class="card-title">Thống kê theo Provider</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px">
          <div
            v-for="(count, provider) in stats.byProvider"
            :key="provider"
            style="padding:12px 20px;background:#f0f4ff;border-radius:8px;text-align:center"
          >
            <div style="font-weight:700;font-size:0.85rem;color:var(--text-secondary)">{{ provider }}</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">{{ count }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
