<script setup>
defineProps({
  status: { type: String, required: true }
})

const map = {
  COMPLETED: 'badge-success',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
  FAILED: 'badge-danger',
  PROCESSING: 'badge-warning',
  PENDING: 'badge-info',
  NOT_GRADED: 'badge-info',
  CACHED: 'badge-primary'
}

const label = {
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  FAILED: 'Thất bại',
  PROCESSING: 'Đang xử lý',
  PENDING: 'Chờ xử lý',
  NOT_GRADED: 'Chưa chấm',
  CACHED: 'Đã cache'
}
</script>

<template>
  <span class="badge" :class="map[status] || 'badge-info'">
    {{ label[status] || status }}
  </span>
</template>
