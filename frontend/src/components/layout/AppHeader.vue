<template>
  <div class="app-header">
    <div class="left-zone">
      <div class="toggle-btn" @click="toggleCollapse">
        <el-icon :size="18">
          <Expand v-if="isCollapse" />
          <Fold v-else />
        </el-icon>
      </div>

      <div class="title">
        <h2>{{ pageTitle }}</h2>
        <span>Home / Workspace</span>
      </div>
    </div>

    <div class="right-menu">
      <el-input placeholder="Search" class="search" />
      <el-button :icon="Bell" circle />
      <el-dropdown trigger="click" @command="handleCommand">
        <div class="avatar-container">
          <el-avatar :size="30" :src="user?.avatar">{{ user?.name?.charAt(0)?.toUpperCase() }}</el-avatar>
          <span class="username">{{ user?.name || 'User' }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Expand, Fold, Bell, ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'

defineProps<{ isCollapse: boolean }>()
const emit = defineEmits<{ toggleCollapse: [] }>()

const route = useRoute()
const authStore = useAuthStore()

const user = computed(() => authStore.user)
const pageTitle = computed(() => (route.meta.title as string) || 'Your work')

const toggleCollapse = () => emit('toggleCollapse')

const handleCommand = async (command: string) => {
  if (command !== 'logout') return
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    authStore.logout()
  } catch {
    // canceled
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 14px;
}

.left-zone {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-btn {
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
}

.toggle-btn:hover {
  background: #ebecf0;
}

.title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #172b4d;
}

.title span {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #5e6c84;
}

.right-menu {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search {
  width: 220px;
}

.avatar-container {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
}

.avatar-container:hover {
  background: #ebecf0;
}

.username {
  font-size: 13px;
  color: #42526e;
}

@media (max-width: 768px) {
  .search,
  .username,
  .title span {
    display: none;
  }
}
</style>
