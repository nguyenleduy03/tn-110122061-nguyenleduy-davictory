import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'Tổng quan', icon: 'dashboard' }
  },
  {
    path: '/grading',
    name: 'Grading',
    component: () => import('../views/GradingView.vue'),
    meta: { title: 'Chấm thi', icon: 'grading' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
    meta: { title: 'Lịch sử chấm', icon: 'history' }
  },
  {
    path: '/samples',
    name: 'Samples',
    component: () => import('../views/SamplesView.vue'),
    meta: { title: 'Quản lý bài mẫu', icon: 'samples' }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('../views/StatsView.vue'),
    meta: { title: 'Thống kê', icon: 'stats' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Cấu hình', icon: 'settings' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
