<template>
  <el-container class="app-layout">
    <el-aside :width="isCollapse ? '72px' : '280px'" class="aside">
      <AppSidebar :isCollapse="isCollapse" />
    </el-aside>

    <el-container class="content-shell">
      <el-header class="header">
        <AppHeader :isCollapse="isCollapse" @toggleCollapse="isCollapse = !isCollapse" />
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page-fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const isCollapse = ref(false)
</script>

<style scoped>
.app-layout {
  height: 100dvh;
  width: 100%;
}

.aside {
  transition: width 0.22s ease;
  background: #f4f5f7;
  border-right: 1px solid #dfe1e6;
}

.content-shell {
  min-width: 0;
}

.header {
  padding: 0;
  height: 64px;
  border-bottom: 1px solid #dfe1e6;
  background: #ffffff;
}

.main {
  padding: 20px;
  overflow: auto;
  min-width: 0;
  background: #f4f5f7;
}

.page-fade-slide-enter-active,
.page-fade-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-fade-slide-enter-from,
.page-fade-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 900px) {
  .aside {
    width: 72px !important;
  }

  .main {
    padding: 12px;
  }
}
</style>
