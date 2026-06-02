<script setup>
import { ref } from 'vue'
import { testGrade } from '../api/grading'
import CriteriaCard from '../components/CriteriaCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const form = ref({
  essayText: '',
  taskType: 'TASK2_ACADEMIC',
  topic: ''
})

const loading = ref(false)
const error = ref('')
const result = ref(null)

const criteriaLabels = {
  taskResponse: 'Task Response',
  coherenceCohesion: 'Coherence & Cohesion',
  lexicalResource: 'Lexical Resource',
  grammaticalRange: 'Gram. Range & Accuracy'
}

async function handleGrade() {
  if (!form.value.essayText.trim()) {
    error.value = 'Vui lòng nhập nội dung bài viết'
    return
  }
  loading.value = true
  error.value = ''
  result.value = null

  try {
    const res = await testGrade({
      essayText: form.value.essayText,
      taskType: form.value.taskType,
      topic: form.value.topic || 'General'
    })
    result.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatMs(ms) {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's'
  return ms + 'ms'
}
</script>

<template>
  <div>
    <h1 class="page-title">Chấm thi</h1>
    <p class="page-subtitle">Chấm bài IELTS Writing bằng AI (Groq Llama 3 70B)</p>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Nhập bài viết</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Task Type</label>
          <select v-model="form.taskType">
            <option value="TASK2_ACADEMIC">Task 2 - Academic (Essay)</option>
            <option value="TASK1_ACADEMIC">Task 1 - Academic (Chart/Graph)</option>
            <option value="TASK2_GENERAL">Task 2 - General (Essay)</option>
            <option value="TASK1_GENERAL">Task 1 - General (Letter)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Chủ đề</label>
          <input
            v-model="form.topic"
            type="text"
            placeholder="VD: Environment, Education..."
          />
        </div>
      </div>

      <div class="form-group">
        <label>Nội dung bài viết</label>
        <textarea
          v-model="form.essayText"
          rows="14"
          placeholder="Dán nội dung bài viết vào đây..."
        ></textarea>
      </div>

      <button
        class="btn btn-primary"
        :disabled="loading"
        @click="handleGrade"
      >
        {{ loading ? 'Đang chấm...' : 'Chấm bằng AI' }}
      </button>

      <LoadingSpinner
        v-if="loading"
        text="AI đang phân tích bài viết theo 4 tiêu chí IELTS..."
      />

      <div v-if="error" class="alert alert-error" style="margin-top:16px">{{ error }}</div>
    </div>

    <div v-if="result" class="card" style="margin-top:20px">
      <div class="result-header">
        <span class="badge badge-primary">AI Graded</span>
        <span class="meta-text">
          Confidence: <strong>{{ (result.confidenceScore * 100).toFixed(0) }}%</strong>
          &nbsp;|&nbsp;
          Latency: <strong>{{ formatMs(result.latencyMs) }}</strong>
        </span>
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
        <strong>Nhận xét tổng quan:</strong>
        <p>{{ result.overallFeedback }}</p>
      </div>

      <div v-if="result.referenceSampleIds?.length" class="meta-text" style="margin-top:12px">
        Reference samples: #{{ result.referenceSampleIds.join(', #') }}
      </div>

      <div class="meta-text" style="margin-top:8px">
        Provider: {{ result.provider }} | Model: {{ result.model }} | Prompt: {{ result.promptVersion }}
      </div>
    </div>
  </div>
</template>
