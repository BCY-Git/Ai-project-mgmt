<template>
  <div class="app-sidebar">
    <div class="logo" @click="$router.push('/')">
      <div class="logo-mark">J</div>
      <div v-if="!isCollapse" class="logo-text">
        <strong>Jira Style</strong>
        <span>AI Project Hub</span>
      </div>
    </div>

    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapse"
      :unique-opened="true"
      background-color="transparent"
      text-color="#5e6c84"
      active-text-color="#0052cc"
      router
      class="side-menu"
    >
      <el-menu-item index="/dashboard">
        <el-icon><Monitor /></el-icon>
        <template #title>Your work</template>
      </el-menu-item>

      <el-menu-item index="/projects">
        <el-icon><Folder /></el-icon>
        <template #title>Projects</template>
      </el-menu-item>

      <el-menu-item index="/my-tasks">
        <el-icon><List /></el-icon>
        <template #title>My tasks</template>
      </el-menu-item>

      <el-menu-item index="/team" v-if="isManager">
        <el-icon><UserFilled /></el-icon>
        <template #title>People</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Monitor, Folder, List, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth.store'

defineProps<{
  isCollapse: boolean
}>()

const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => {
  const { path } = route
  if (path.startsWith('/projects/')) return '/projects'
  return path
})

const isManager = computed(() => authStore.isManager)
</script>

<style scoped>
.app-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid #dfe1e6;
  cursor: pointer;
}

.logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: #0747a6;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
}

.logo-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo-text strong {
  font-size: 14px;
  color: #172b4d;
  line-height: 1.1;
}

.logo-text span {
  font-size: 11px;
  color: #5e6c84;
}

.side-menu {
  flex: 1;
  border-right: none;
  padding-top: 10px;
}

:deep(.el-menu-item) {
  margin: 2px 8px;
  border-radius: 6px;
  height: 38px;
}

:deep(.el-menu-item.is-active) {
  background: #deebff;
  font-weight: 600;
}

:deep(.el-menu-item:hover) {
  background: #ebecf0;
}
</style>
