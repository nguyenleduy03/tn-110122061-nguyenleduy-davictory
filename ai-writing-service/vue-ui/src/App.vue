<script setup>
import SidebarNav from './components/SidebarNav.vue'
</script>

<template>
  <SidebarNav />
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style scoped>
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 28px 32px;
  min-height: 100vh;
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 20px 16px;
  }
}
</style>
