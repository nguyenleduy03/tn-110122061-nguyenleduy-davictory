<script setup>
defineProps({
  text: { type: String, default: 'Đang tải...' },
  small: { type: Boolean, default: false }
})
</script>

<template>
  <div class="loading-overlay">
    <div class="spinner" :class="{ 'spinner-sm': small }"></div>
    <p v-if="!small" style="margin-top:8px;font-size:0.88rem;color:var(--text-secondary)">{{ text }}</p>
  </div>
</template>
