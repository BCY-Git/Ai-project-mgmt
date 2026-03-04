<template>
  <div class="task-board">
    <!-- Header with filters -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-container">
        <el-row :gutter="20" align="middle">
          <el-col :span="6">
            <el-input
              v-model="searchQuery"
              placeholder="搜索任务..."
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="5">
            <el-select
              v-model="selectedAssignee"
              placeholder="筛选负责人"
              clearable
              @change="handleFilterChange"
            >
              <el-option
                v-for="user in uniqueAssignees"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              >
                <div class="assignee-option">
                  <el-avatar :size="24" :src="user.avatar" style="margin-right: 8px">
                    {{ user.name.charAt(0) }}
                  </el-avatar>
                  <span>{{ user.name }}</span>
                </div>
              </el-option>
            </el-select>
          </el-col>
          <el-col :span="5">
            <el-select
              v-model="selectedPriority"
              placeholder="筛选优先级"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="全部优先级" value="" />
              <el-option label="紧急" value="urgent" />
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-col>
          <el-col :span="8" class="text-right">
            <el-button type="primary" @click="openCreateTaskModal">
              <el-icon><Plus /></el-icon>
              新建任务
            </el-button>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- Kanban Board -->
    <div class="kanban-container" v-loading="taskStore.loading">
      <el-row :gutter="20">
        <el-col
          v-for="column in columns"
          :key="column.key"
          :xs="24"
          :sm="12"
          :md="6"
        >
          <div class="kanban-column" :class="`column-${column.key}`" :data-column="column.key">
            <div class="column-header">
              <h3>{{ column.title }}</h3>
              <el-badge :value="getFilteredTasks(column.key).length" :max="99" class="column-badge" />
            </div>

            <div class="column-body">
              <div
                v-for="task in getFilteredTasks(column.key)"
                :key="task.id"
                class="task-card"
                :data-id="task.id"
                draggable="true"
                @click="openTaskDetail(task)"
                @dragstart="handleDragStart($event, task, column.key)"
                @dragover.prevent
                @drop.prevent="handleDrop($event, column.key)"
                @dragend="handleDragEnd"
              >
                <div class="task-card-header">
                  <h4 class="task-title">{{ task.title }}</h4>
                  <el-dropdown @command="(cmd) => handleTaskAction(cmd, task)" trigger="click">
                    <el-button type="text" size="small" @click.stop>
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="edit">编辑</el-dropdown-item>
                        <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>

                <div class="task-card-body">
                  <div class="task-meta">
                    <el-tag
                      :type="getPriorityType(task.priority)"
                      size="small"
                      effect="dark"
                    >
                      {{ getPriorityLabel(task.priority) }}
                    </el-tag>

                    <span v-if="task.dueDate" class="due-date">
                      <el-icon><Calendar /></el-icon>
                      {{ formatDate(task.dueDate) }}
                    </span>
                  </div>

                  <div v-if="task.assignee" class="task-assignee">
                    <el-avatar :size="24" :src="task.assignee.avatar">
                      {{ task.assignee.name.charAt(0) }}
                    </el-avatar>
                    <span>{{ task.assignee.name }}</span>
                  </div>

                  <!-- Progress for tasks with subtasks -->
                  <div v-if="task.subtasks && task.subtasks.length > 0" class="task-progress">
                    <el-progress
                      :percentage="getCompletionPercentage(task)"
                      :show-text="false"
                      :stroke-width="4"
                    />
                    <span class="progress-text">
                      {{ getCompletedSubtasksCount(task) }}/{{ task.subtasks.length }}
                    </span>
                  </div>

                  <!-- Parent task indicator -->
                  <div v-if="task.parentTask" class="parent-task">
                    <el-icon><Connection /></el-icon>
                    <span>子任务: {{ task.parentTask.title }}</span>
                  </div>
                </div>
              </div>

              <!-- Quick add task button -->
              <el-button
                class="add-task-btn"
                type="text"
                @click="showQuickAdd(column.key)"
                :loading="quickAddStatus[column.key]"
              >
                <el-icon><Plus /></el-icon>
                添加任务
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- Empty state -->
    <el-empty v-if="hasNoTasks" description="暂无任务" class="empty-state">
      <el-button type="primary" @click="openCreateTaskModal">创建第一个任务</el-button>
    </el-empty>

    <!-- Task Detail Modal -->
    <el-dialog
      v-model="showTaskDetail"
      :title="selectedTask?.title"
      width="60%"
      destroy-on-close
    >
      <TaskDetail
        v-if="selectedTask"
        :task="selectedTask"
        @task-updated="handleTaskUpdated"
        @task-deleted="handleTaskDeleted"
        @close="showTaskDetail = false"
      />
    </el-dialog>

    <!-- Create/Edit Task Modal -->
    <el-dialog
      v-model="showCreateTaskModal"
      :title="editingTask ? '编辑任务' : '创建新任务'"
      width="50%"
      destroy-on-close
    >
      <TaskForm
        :task="editingTask"
        :project-id="projectId"
        :visible="showCreateTaskModal"
        @save="handleTaskSaved"
        @close="handleTaskCancel"
      />
    </el-dialog>

    <!-- Quick Add Task Input -->
    <div v-if="quickAddColumn" class="quick-add-input">
      <el-input
        v-model="quickAddTitle"
        placeholder="输入任务标题，按回车创建..."
        @keyup.enter="handleQuickAdd"
        @blur="handleQuickAddCancel"
        ref="quickAddInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Calendar, MoreFilled, Connection } from '@element-plus/icons-vue'
import { useTaskStore } from '@/stores/task.store'
import type { Task } from '@/api/task.api'
import TaskDetail from '@/components/tasks/TaskDetail.vue'
import TaskForm from '@/components/tasks/TaskForm.vue'

// Route and stores
const route = useRoute()
const taskStore = useTaskStore()

// State
const searchQuery = ref('')
const selectedAssignee = ref('')
const selectedPriority = ref('')
const showTaskDetail = ref(false)
const showCreateTaskModal = ref(false)
const selectedTask = ref<Task | null>(null)
const editingTask = ref<Task | null>(null)
const quickAddColumn = ref<string | null>(null)
const quickAddTitle = ref('')
const quickAddInput = ref()
const quickAddStatus = ref<Record<string, boolean>>({})
const draggedTask = ref<Task | null>(null)
const draggedFromColumn = ref<string>('')

// Project ID from route
const projectId = computed(() => route.params.id as string)

// Columns configuration
const columns = [
  { key: 'todo', title: '待处理' },
  { key: 'in_progress', title: '进行中' },
  { key: 'review', title: '待审核' },
  { key: 'done', title: '已完成' }
]

// Computed
const hasNoTasks = computed(() => {
  return taskStore.flatTasks.length === 0 && !taskStore.loading
})

const uniqueAssignees = computed(() => {
  const assigneeMap = new Map<string, any>()
  taskStore.flatTasks.forEach(task => {
    if (task.assignee && !assigneeMap.has(task.assignee.id)) {
      assigneeMap.set(task.assignee.id, task.assignee)
    }
  })
  return Array.from(assigneeMap.values())
})

// Methods
const getFilteredTasks = (status: string) => {
  let tasks = taskStore.tasksByStatus[status] || []

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    tasks = tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    )
  }

  // Apply assignee filter
  if (selectedAssignee.value) {
    tasks = tasks.filter(task => task.assigneeId === selectedAssignee.value)
  }

  // Apply priority filter
  if (selectedPriority.value) {
    tasks = tasks.filter(task => task.priority === selectedPriority.value)
  }

  return tasks
}

const handleSearch = () => {
  // Search is reactive, no need to do anything
}

const handleFilterChange = () => {
  // Filters are reactive, no need to do anything
}

const handleDragStart = (event: DragEvent, task: Task, fromColumn: string) => {
  draggedTask.value = task
  draggedFromColumn.value = fromColumn
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', task.id)
  }
}

const handleDrop = async (event: DragEvent, toColumn: string) => {
  if (!draggedTask.value || draggedFromColumn.value === toColumn) return

  try {
    await taskStore.updateTaskStatus(draggedTask.value.id, toColumn as Task['status'])
    ElMessage.success('任务状态更新成功')
  } catch (error) {
    ElMessage.error('更新任务状态失败')
  }
}

const handleDragEnd = () => {
  draggedTask.value = null
  draggedFromColumn.value = ''
}

const openTaskDetail = (task: Task) => {
  selectedTask.value = task
  showTaskDetail.value = true
}

const handleTaskAction = async (command: string, task: Task) => {
  if (command === 'edit') {
    editingTask.value = task
    showCreateTaskModal.value = true
  } else if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这个任务吗？', '确认删除', {
        type: 'warning'
      })
      await taskStore.deleteTask(task.id)
      ElMessage.success('任务删除成功')
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除任务失败')
      }
    }
  }
}

const openCreateTaskModal = () => {
  editingTask.value = null
  showCreateTaskModal.value = true
}

const showQuickAdd = (column: string) => {
  quickAddColumn.value = column
  quickAddTitle.value = ''
  nextTick(() => {
    quickAddInput.value?.focus()
  })
}

const handleQuickAdd = async () => {
  if (!quickAddTitle.value.trim()) return

  const status = quickAddColumn.value as Task['status']
  quickAddStatus.value[status] = true

  try {
    await taskStore.createTask({
      title: quickAddTitle.value.trim(),
      status,
      projectId: projectId.value,
      priority: 'medium',
      description: '',
      estimatedHours: null,
      parentTaskId: null,
      assigneeId: null, // Will be set by the user from the form
      tags: []
    })
    ElMessage.success('任务创建成功')
    quickAddColumn.value = null
    quickAddTitle.value = ''
  } catch (error) {
    ElMessage.error('创建任务失败')
  } finally {
    quickAddStatus.value[status] = false
  }
}

const handleQuickAddCancel = () => {
  setTimeout(() => {
    quickAddColumn.value = null
    quickAddTitle.value = ''
  }, 200)
}

const handleTaskUpdated = (updatedTask: Task) => {
  taskStore.updateTask(updatedTask.id, updatedTask)
  showTaskDetail.value = false
}

const handleTaskDeleted = () => {
  showTaskDetail.value = false
}

const handleTaskSaved = (taskData: Partial<Task>) => {
  editingTask.value = null
  showCreateTaskModal.value = false
}

const handleTaskCancel = () => {
  editingTask.value = null
  showCreateTaskModal.value = false
}

const getPriorityType = (priority: string) => {
  const types: Record<string, string> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info'
  }
  return types[priority] || 'info'
}

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return labels[priority] || priority
}

const getCompletionPercentage = (task: Task) => {
  if (!task.subtasks || task.subtasks.length === 0) return 0
  const completed = task.subtasks.filter(st => st.status === 'done').length
  return Math.round((completed / task.subtasks.length) * 100)
}

const getCompletedSubtasksCount = (task: Task) => {
  if (!task.subtasks) return 0
  return task.subtasks.filter(st => st.status === 'done').length
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

// Initialize
const initialize = async () => {
  if (projectId.value) {
    await taskStore.buildTaskTree(projectId.value)
  } else {
    await taskStore.fetchTasks()
  }
}

onMounted(() => {
  initialize()
})

// Watch for project changes
watch(projectId, () => {
  initialize()
})
</script>

<style scoped>
.task-board {
  padding: 20px;
  min-height: calc(100vh - 120px);
  background-color: #f5f7fa;
}

.filter-card {
  margin-bottom: 20px;
  background-color: #fff;
}

.filter-container {
  padding: 10px 0;
}

.assignee-option {
  display: flex;
  align-items: center;
}

.kanban-container {
  margin-top: 20px;
}

.kanban-column {
  background-color: #fff;
  border-radius: 8px;
  min-height: 600px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.column-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.column-badge {
  margin-left: 10px;
}

.column-todo .column-header {
  background-color: #f8f9fa;
  border-bottom-color: #dee2e6;
}

.column-in_progress .column-header {
  background-color: #e3f2fd;
  border-bottom-color: #2196f3;
}

.column-review .column-header {
  background-color: #fff3e0;
  border-bottom-color: #ff9800;
}

.column-done .column-header {
  background-color: #e8f5e9;
  border-bottom-color: #4caf50;
}

.column-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.task-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.task-card.dragging {
  opacity: 0.5;
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.task-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  flex: 1;
  margin-right: 8px;
  line-height: 1.4;
}

.task-card-body {
  font-size: 12px;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.due-date {
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  margin-bottom: 8px;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 12px;
  color: #909399;
  min-width: 40px;
}

.parent-task {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 11px;
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.add-task-btn {
  width: 100%;
  height: 36px;
  color: #909399;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  margin-top: 8px;
  transition: all 0.3s;
}

.add-task-btn:hover {
  color: #409eff;
  border-color: #409eff;
  background-color: #ecf5ff;
}

.empty-state {
  margin-top: 100px;
}

.quick-add-input {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.text-right {
  text-align: right;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .task-board {
    padding: 10px;
  }

  .filter-container .el-col {
    margin-bottom: 10px;
  }

  .kanban-column {
    min-height: 400px;
    margin-bottom: 20px;
  }
}
</style>
