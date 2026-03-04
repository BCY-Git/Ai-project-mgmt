<template>
  <div class="my-tasks">
    <el-card>
      <template #header>
        <div class="header">
          <span>我的任务</span>
          <el-tag type="info">共 {{ myTasks.length }} 项</el-tag>
        </div>
      </template>

      <div v-if="taskStore.loading">
        <el-skeleton :rows="5" animated />
      </div>

      <el-empty
        v-else-if="myTasks.length === 0"
        description="暂无分配给你的任务"
      />

      <div v-else class="task-list">
        <div
          v-for="task in myTasks"
          :key="task.id"
          class="task-item"
          @click="$router.push(`/projects/${task.projectId}/board`)"
        >
          <div class="task-main">
            <div class="title">{{ task.title }}</div>
            <div class="meta">
              <span>项目 #{{ task.projectId }}</span>
              <span v-if="task.estimatedHours">预估 {{ task.estimatedHours }}h</span>
            </div>
          </div>
          <el-tag :type="getTaskStatusType(task.status)">
            {{ getTaskStatusText(task.status) }}
          </el-tag>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task.store'
import { useAuthStore } from '@/stores/auth.store'
import type { Task } from '@/api/task.api'

const taskStore = useTaskStore()
const authStore = useAuthStore()
const myTasks = computed(() => taskStore.myTasks)

const getTaskStatusType = (status: Task['status']) => {
  const map: Record<Task['status'], string> = {
    todo: '',
    in_progress: 'warning',
    review: 'warning',
    done: 'success',
  }
  return map[status]
}

const getTaskStatusText = (status: Task['status']) => {
  const map: Record<Task['status'], string> = {
    todo: '待办',
    in_progress: '进行中',
    review: '待审核',
    done: '已完成',
  }
  return map[status]
}

onMounted(async () => {
  if (!authStore.user && authStore.isAuthenticated) {
    await authStore.fetchCurrentUser()
  }
  await taskStore.fetchTasks()
})
</script>

<style scoped>
.my-tasks {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.task-main {
  min-width: 0;
}

.title {
  font-weight: 600;
  color: #243447;
}

.meta {
  margin-top: 4px;
  color: #708090;
  font-size: 12px;
  display: flex;
  gap: 10px;
}
</style>
