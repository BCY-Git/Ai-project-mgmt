<template>
  <div class="project-detail" v-if="!projectStore.loading">
    <div class="topbar">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/projects' }">项目中心</el-breadcrumb-item>
        <el-breadcrumb-item>{{ projectStore.currentProject?.name }}</el-breadcrumb-item>
      </el-breadcrumb>
      <div class="topbar-actions">
        <el-button type="warning" plain @click="$router.push(`/projects/${projectId}/decompose`)">AI拆解</el-button>
        <el-button type="primary" plain @click="$router.push(`/projects/${projectId}/board`)">任务看板</el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="8">
        <el-card class="info-panel" shadow="never">
          <template #header>
            <div class="panel-header">
              <span>项目信息</span>
              <el-tag :type="getProjectStatusType(projectStore.currentProject?.status)">
                {{ getProjectStatusText(projectStore.currentProject?.status) }}
              </el-tag>
            </div>
          </template>

          <div class="kv"><span>项目名称</span><strong>{{ projectStore.currentProject?.name }}</strong></div>
          <div class="kv"><span>创建时间</span><strong>{{ formatDate(projectStore.currentProject?.createdAt) }}</strong></div>
          <div class="kv" v-if="projectStore.currentProject?.deadline">
            <span>截止日期</span><strong>{{ formatDate(projectStore.currentProject?.deadline) }}</strong>
          </div>

          <p class="project-desc">{{ projectStore.currentProject?.description || '暂无描述' }}</p>

          <h4>项目成员</h4>
          <el-empty
            v-if="!projectStore.currentProject?.members || projectStore.currentProject.members.length === 0"
            description="暂无成员"
            :image-size="80"
          />
          <div v-else class="members">
            <div v-for="member in projectStore.currentProject.members" :key="member.id" class="member-item">
              <el-avatar :size="28">{{ member.name?.charAt(0) || member.email?.charAt(0) }}</el-avatar>
              <span>{{ member.name || member.email }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="16">
        <el-card class="tasks-panel" shadow="never">
          <template #header>
            <div class="panel-header">
              <span>任务列表</span>
              <el-button type="primary" size="small" @click="showAddTaskDialog = true">添加任务</el-button>
            </div>
          </template>

          <div class="task-stats">
            <div class="stat-box"><span>总任务</span><strong>{{ projectTasks.length }}</strong></div>
            <div class="stat-box"><span>待办</span><strong>{{ tasksByStatus.todo.length }}</strong></div>
            <div class="stat-box"><span>进行中</span><strong>{{ tasksByStatus.in_progress.length }}</strong></div>
            <div class="stat-box"><span>已完成</span><strong>{{ tasksByStatus.done.length }}</strong></div>
          </div>

          <div class="task-list" v-if="projectTasks.length > 0">
            <div v-for="task in projectTasks" :key="task.id" class="task-item" :class="{ done: task.status === 'done' }">
              <div class="task-head">
                <p>{{ task.title }}</p>
                <div class="tags">
                  <el-tag size="small" :type="getTaskStatusType(task.status)">{{ getTaskStatusText(task.status) }}</el-tag>
                  <el-tag v-if="task.priority" size="small" :type="getPriorityType(task.priority)">{{ getPriorityText(task.priority) }}</el-tag>
                </div>
              </div>
              <p class="desc" v-if="task.description">{{ task.description }}</p>
              <div class="meta">
                <span v-if="task.assignee">负责人: {{ task.assignee.name || task.assignee.email }}</span>
                <span>更新于: {{ formatDate(task.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <el-empty v-else description="暂无任务">
            <el-button type="primary" @click="showAddTaskDialog = true">创建第一个任务</el-button>
          </el-empty>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showAddTaskDialog" title="添加任务" width="520px">
      <el-form :model="taskForm" label-width="80px">
        <el-form-item label="任务标题" required>
          <el-input v-model="taskForm.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input v-model="taskForm.description" type="textarea" :rows="3" placeholder="请输入任务描述" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="taskForm.assigneeId" placeholder="选择负责人" style="width: 100%" clearable>
            <el-option
              v-for="user in assignableUsers"
              :key="user.id"
              :label="user.name || user.email"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="taskForm.priority" placeholder="选择优先级" style="width: 100%" clearable>
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTaskDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddTask" :loading="taskStore.loading || isSubmittingTask">添加</el-button>
      </template>
    </el-dialog>
  </div>

  <div v-else class="loading-container">
    <el-skeleton :rows="8" animated />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project.store'
import { useTaskStore } from '@/stores/task.store'
import { ElMessage } from 'element-plus'
import { TaskPriority, TaskStatus } from '@/api/task.api'
import http from '@/api/http'

const route = useRoute()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

const showAddTaskDialog = ref(false)
const isSubmittingTask = ref(false)
const projectId = route.params.id as string
const assignableUsers = ref<Array<{ id: string; name: string; email: string }>>([])

const taskForm = ref<{
  title: string
  description: string
  assigneeId: string
  priority: TaskPriority | ''
}>({
  title: '',
  description: '',
  assigneeId: '',
  priority: ''
})

const projectTasks = computed(() => taskStore.tasksByProject(projectId))

const tasksByStatus = computed(() => {
  const tasks = projectTasks.value
  return {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    done: tasks.filter(t => t.status === 'done')
  }
})

onMounted(async () => {
  try {
    await Promise.all([projectStore.fetchProject(projectId), taskStore.fetchTasks()])
    await fetchAssignableUsers()
  } catch (_error) {
    ElMessage.error('加载项目详情失败')
  }
})

const fetchAssignableUsers = async () => {
  try {
    const users = await http.get('/users')
    if (Array.isArray(users)) {
      assignableUsers.value = users
      return
    }
  } catch (_error) {
    // Fall back to project members when current user has no users:list permission.
  }

  assignableUsers.value = (projectStore.currentProject?.members || []).map(member => ({
    id: member.id,
    name: member.name,
    email: member.email,
  }))
}

const handleAddTask = async () => {
  if (isSubmittingTask.value) return

  if (!taskForm.value.title) {
    ElMessage.warning('请输入任务标题')
    return
  }

  const payload: {
    title: string
    description?: string
    assigneeId?: string
    priority?: TaskPriority
    projectId: string
    status: TaskStatus
  } = {
    title: taskForm.value.title,
    projectId,
    status: TaskStatus.TODO,
  }

  if (taskForm.value.description.trim()) {
    payload.description = taskForm.value.description.trim()
  }

  if (taskForm.value.assigneeId) {
    payload.assigneeId = taskForm.value.assigneeId
  }

  if (taskForm.value.priority) {
    payload.priority = taskForm.value.priority
  }

  isSubmittingTask.value = true
  try {
    await taskStore.createTask(payload)
    showAddTaskDialog.value = false
    taskForm.value = { title: '', description: '', assigneeId: '', priority: '' }
  } catch (_error) {
    // Store handles error messaging.
  } finally {
    isSubmittingTask.value = false
  }
}

const getProjectStatusType = (status?: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    decomposing: 'warning',
    reviewing: 'warning',
    active: 'success',
    completed: '',
    archived: 'info',
  }
  return map[status || ''] || 'info'
}

const getProjectStatusText = (status?: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    decomposing: 'AI拆解中',
    reviewing: '待审核',
    active: '进行中',
    completed: '已完成',
    archived: '已归档',
  }
  return map[status || ''] || '未知状态'
}

const getTaskStatusType = (status: string) => {
  const map: Record<string, string> = {
    todo: 'info',
    in_progress: 'warning',
    review: 'warning',
    done: 'success',
  }
  return map[status] || 'info'
}

const getTaskStatusText = (status: string) => {
  const map: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    review: '待审核',
    done: '已完成',
  }
  return map[status] || status
}

const getPriorityType = (priority: string) => {
  const map: Record<string, string> = {
    low: 'info',
    medium: '',
    high: 'warning',
    urgent: 'danger',
  }
  return map[priority] || ''
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }
  return map[priority] || priority
}

const formatDate = (date?: string | null) => {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.topbar-actions {
  display: flex;
  gap: 8px;
}

.info-panel,
.tasks-panel {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-default);
}

.kv span {
  color: var(--text-muted);
  font-size: 12px;
}

.kv strong {
  font-size: 14px;
}

.project-desc {
  margin: 12px 0;
  color: var(--text-secondary);
  line-height: 1.55;
}

h4 {
  margin: 12px 0 8px;
}

.members {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.task-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.stat-box {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  padding: 10px;
}

.stat-box span {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-box strong {
  display: block;
  margin-top: 4px;
  font-size: 22px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 580px;
  overflow-y: auto;
}

.task-item {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 12px;
}

.task-item.done {
  opacity: 0.65;
}

.task-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.task-head p {
  margin: 0;
  font-weight: 600;
}

.tags {
  display: flex;
  gap: 6px;
}

.desc {
  margin: 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-muted);
}

.loading-container {
  padding: 20px;
}

@media (max-width: 900px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
