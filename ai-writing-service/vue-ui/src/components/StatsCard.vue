<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  icon: { type: String, default: '' }
})
</script>

<template>
  <div class="stat-card">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value">{{ value }}</div>
    <div v-if="icon" class="stat-icon" v-html="icon"></div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 22px 20px;
  box-shadow: var(--shadow);
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.stat-value {
  font-size: 2.2rem;
  font-weight: 800;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}
.stat-label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.stat-icon {
  font-size: 1.5rem;
  margin-top: 8px;
  opacity: 0.3;
}
</style>
