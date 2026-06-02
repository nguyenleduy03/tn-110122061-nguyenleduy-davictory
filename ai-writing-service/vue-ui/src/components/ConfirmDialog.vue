<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Xác nhận' },
  message: { type: String, default: 'Bạn có chắc chắn?' },
  confirmText: { type: String, default: 'Xác nhận' },
  cancelText: { type: String, default: 'Hủy' },
  danger: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

function onConfirm() { emit('confirm') }
function onCancel() { emit('cancel') }
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="onCancel">
      <div class="modal-content">
        <h3 class="modal-title">{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="onCancel">{{ cancelText }}</button>
          <button
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="onConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
