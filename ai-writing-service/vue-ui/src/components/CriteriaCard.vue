<script setup>
defineProps({
  name: { type: String, required: true },
  band: { type: Number, default: 0 },
  strengths: { type: Array, default: () => [] },
  weaknesses: { type: Array, default: () => [] },
  detailedFeedback: { type: String, default: '' }
})
</script>

<template>
  <div class="criteria-card">
    <div class="cc-header">
      <span class="cc-name">{{ name }}</span>
      <span class="cc-score">{{ band?.toFixed(1) || '-' }}</span>
    </div>
    <div v-if="strengths.length" class="cc-list cc-strengths">
      <strong>&#10003; Điểm mạnh</strong>
      <ul>
        <li v-for="(s, i) in strengths" :key="i">{{ s }}</li>
      </ul>
    </div>
    <div v-if="weaknesses.length" class="cc-list cc-weaknesses">
      <strong>&#10007; Cần cải thiện</strong>
      <ul>
        <li v-for="(w, i) in weaknesses" :key="i">{{ w }}</li>
      </ul>
    </div>
  </div>
</template>
