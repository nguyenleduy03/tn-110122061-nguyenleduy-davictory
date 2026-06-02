<script setup>
import { ref, onMounted } from 'vue'
import { getAccuracy, getEvaluationStats } from '../api/evaluation'
import StatsCard from '../components/StatsCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const loading = ref(true)
const error = ref('')
const accuracy = ref({})
const stats = ref({})
const showDetails = ref(false)

onMounted(async () => {
  try {
    const [accRes, statsRes] = await Promise.all([
      getAccuracy().catch(() => ({ data: {} })),
      getEvaluationStats().catch(() => ({ data: {} }))
    ])
    accuracy.value = accRes.data
    stats.value = statsRes.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="page-title">Thống kê đánh giá</h1>
    <p class="page-subtitle">Độ chính xác của AI so với giáo viên</p>

    <LoadingSpinner v-if="loading" text="Đang tải dữ liệu..." />

    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <template v-else>
      <div class="stats-grid">
        <StatsCard label="Tổng bài đã chấm" :value="stats.totalGraded || 0" />
        <StatsCard label="Đã duyệt" :value="stats.approved || 0" />
        <StatsCard label="Từ chối" :value="stats.rejected || 0" />
        <StatsCard label="Tỉ lệ duyệt" :value="(stats.approvalRate || 0) + '%'" />
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Độ chính xác</span>
          <button class="btn btn-sm btn-outline" @click="showDetails = !showDetails">
            {{ showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết' }}
          </button>
        </div>

        <div v-if="accuracy.message" class="alert alert-info">{{ accuracy.message }}</div>

        <div v-else class="stats-grid" style="margin-bottom:0">
          <StatsCard label="MAE (Sai số TB)" :value="accuracy.mae ?? '-'" />
          <StatsCard label="RMSE" :value="accuracy.rmse ?? '-'" />
          <StatsCard label="Pearson R" :value="accuracy.pearsonR ?? '-'" />
          <StatsCard label="Số điểm dữ liệu" :value="accuracy.dataPoints || 0" />
        </div>

        <div v-if="accuracy.dataPoints > 0" class="stats-grid" style="margin-top:12px">
          <StatsCard
            label="Trùng khớp chính xác"
            :value="(accuracy.exactMatchPercent ?? 0) + '%'"
          />
          <StatsCard
            label="Sai lệch &#8804; 0.5 band"
            :value="(accuracy.withinHalfBandPercent ?? 0) + '%'"
          />
        </div>
      </div>

      <div v-if="showDetails && accuracy.details?.length" class="card">
        <div class="card-title" style="margin-bottom:16px">Chi tiết từng bài</div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>AI Band</th>
                <th>Teacher Band</th>
                <th>Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in accuracy.details" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ d.aiBand?.toFixed(1) }}</td>
                <td>{{ d.teacherBand?.toFixed(1) }}</td>
                <td>
                  <span
                    class="badge"
                    :class="Math.abs(d.difference) <= 0.5 ? 'badge-success' : 'badge-danger'"
                  >
                    {{ d.difference > 0 ? '+' : '' }}{{ d.difference?.toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" v-if="stats.byProvider && Object.keys(stats.byProvider).length">
        <div class="card-title" style="margin-bottom:16px">Theo Provider</div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Số bài chấm</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(count, provider) in stats.byProvider" :key="provider">
                <td>{{ provider }}</td>
                <td>{{ count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
