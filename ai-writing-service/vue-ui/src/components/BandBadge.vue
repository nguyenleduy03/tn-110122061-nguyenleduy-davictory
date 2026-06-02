<script setup>
defineProps({
  band: { type: Number, required: true }
})

const colors = {
  high: 'badge-success',
  mid: 'badge-warning',
  low: 'badge-danger'
}

function getClass(b) {
  if (b >= 7.5) return colors.high
  if (b >= 5.5) return colors.mid
  return colors.low
}
</script>

<template>
  <span class="badge" :class="getClass(band)">
    {{ band?.toFixed(1) || 'N/A' }}
  </span>
</template>
