<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/', name: 'Dashboard', icon: '&#9632;', label: 'Tổng quan' },
  { path: '/grading', name: 'Grading', icon: '&#9998;', label: 'Chấm thi' },
  { path: '/history', name: 'History', icon: '&#9776;', label: 'Lịch sử chấm' },
  { path: '/samples', name: 'Samples', icon: '&#9733;', label: 'Bài mẫu' },
  { path: '/stats', name: 'Stats', icon: '&#9731;', label: 'Thống kê' },
  { path: '/settings', name: 'Settings', icon: '&#9881;', label: 'Cấu hình' }
]

const isActive = (path) => route.path === path

function navigate(path) {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand" @click="navigate('/')">
      <div class="brand-icon">AI</div>
      <div class="brand-text">
        <span class="brand-name">AI Grading</span>
        <span class="brand-version">v1.0</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
      >
        <span class="nav-icon" v-html="item.icon"></span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-status">
        <span class="status-dot"></span>
        Service: 5180
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow-y: auto;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-weight: 700;
  font-size: 1rem;
  color: #f0f0f5;
  line-height: 1.3;
}

.brand-version {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}

.nav-item.active {
  background: rgba(102, 126, 234, 0.18);
  color: #fff;
}

.nav-icon {
  font-size: 1.1rem;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

.sidebar-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #27ae60;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    position: relative;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 8px;
  }

  .sidebar-brand {
    padding: 10px;
    border-bottom: none;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }

  .sidebar-nav {
    flex-direction: row;
    padding: 4px;
    flex: 1;
    overflow-x: auto;
  }

  .nav-item {
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    font-size: 0.7rem;
    white-space: nowrap;
    width: auto;
  }

  .sidebar-footer {
    display: none;
  }
}
</style>
