<template>
  <el-dialog
    :model-value="visible"
    :title="task ? 'Edit Task' : 'Create New Task'"
    width="600px"
    @close="handleClose"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Title" prop="title">
        <el-input
          v-model="form.title"
          placeholder="Enter task title"
          :maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="Description" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="Enter task description"
          :maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="Assignee" prop="assigneeId">
        <el-select
          v-model="form.assigneeId"
          placeholder="Select assignee"
          clearable
          filterable
          style="width: 100%"
        >
          <el-option
            v-for="user in projectMembers"
            :key="user.id"
            :label="user.name"
            :value="user.id"
          >
            <div class="member-option">
              <el-avatar :size="24" :src="user.avatar">
                {{ user.name.charAt(0) }}
              </el-avatar>
              <span class="member-name">{{ user.name }}</span>
              <span class="member-email">{{ user.email }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="Priority" prop="priority">
        <el-select v-model="form.priority" style="width: 100%">
          <el-option label="Low" value="low" />
          <el-option label="Medium" value="medium" />
          <el-option label="High" value="high" />
          <el-option label="Urgent" value="urgent" />
        </el-select>
      </el-form-item>

      <el-form-item label="Due Date" prop="dueDate">
        <el-date-picker
          v-model="form.dueDate"
          type="date"
          placeholder="Select due date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          :disabled-date="disablePastDates"
        />
      </el-form-item>

      <el-form-item label="Estimated Hours" prop="estimatedHours">
        <el-input-number
          v-model="form.estimatedHours"
          :min="0"
          :max="999"
          :precision="1"
          placeholder="Hours"
          style="width: 100%"
          controls-position="right"
        />
      </el-form-item>

      <el-form-item label="Parent Task" prop="parentTaskId">
        <el-select
          v-model="form.parentTaskId"
          placeholder="Select parent task (optional)"
          clearable
          filterable
          style="width: 100%"
        >
          <el-option
            v-for="parentTask in parentTaskOptions"
            :key="parentTask.id"
            :label="parentTask.title"
            :value="parentTask.id"
          >
            <div class="parent-task-option">
              <span class="task-title">{{ parentTask.title }}</span>
              <el-tag :type="getStatusType(parentTask.status)" size="small">
                {{ getStatusLabel(parentTask.status) }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="Tags" prop="tags">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="Add or create tags"
          style="width: 100%"
        >
          <el-option
            v-for="tag in commonTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
        <div class="tags-hint">
          Tip: Press Enter to create a new tag
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">
          Cancel
        </el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="loading"
        >
          {{ task ? 'Update Task' : 'Create Task' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useTaskStore } from '@/stores/task.store'
import { useProjectStore } from '@/stores/project.store'
import type { Task, TaskStatus, TaskPriority } from '@/api/task.api'

interface Props {
  task?: Task | null
  visible: boolean
  projectId?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'save', taskData: Partial<Task>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const projectMembers = ref<any[]>([])

const commonTags = [
  'frontend', 'backend', 'design', 'testing', 'documentation',
  'bug', 'feature', 'enhancement', 'urgent', 'review',
  'deployment', 'research', 'refactoring', 'optimization'
]

const form = ref({
  title: '',
  description: '',
  assigneeId: null as string | null,
  priority: 'medium' as TaskPriority,
  dueDate: null as string | null,
  estimatedHours: null as number | null,
  parentTaskId: null as string | null,
  tags: [] as string[]
})

const rules: FormRules = {
  title: [
    { required: true, message: 'Please enter task title', trigger: 'blur' },
    { min: 1, max: 100, message: 'Title should be 1 to 100 characters', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: 'Please select priority', trigger: 'change' }
  ]
}

const parentTaskOptions = computed(() => {
  if (!props.projectId) return []

  return taskStore.flatTasks.filter(task =>
    task.projectId === props.projectId &&
    task.id !== props.task?.id &&
    !isDescendant(props.task?.id || '', task.id)
  )
})

const isDescendant = (parentId: string, taskId: string): boolean => {
  const task = taskStore.flatTasks.find(t => t.id === taskId)
  if (!task) return false

  if (task.parentTaskId === parentId) return true
  if (task.parentTaskId) return isDescendant(parentId, task.parentTaskId)

  return false
}

const getStatusType = (status: TaskStatus) => {
  const types: Record<TaskStatus, string> = {
    todo: 'info',
    in_progress: 'warning',
    review: '',
    done: 'success'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status: TaskStatus) => {
  const labels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done'
  }
  return labels[status] || 'Unknown'
}

const disablePastDates = (date: Date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

const loadProjectMembers = async () => {
  if (!props.projectId) return

  try {
    // In a real implementation, this would fetch from the project API
    // For now, we'll use mock data
    projectMembers.value = [
      { id: '1', name: 'John Doe', email: 'john@example.com', avatar: '' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: '' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: '' }
    ]
  } catch (error) {
    console.error('Failed to load project members:', error)
    ElMessage.error('Failed to load project members')
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    assigneeId: null,
    priority: 'medium',
    dueDate: null,
    estimatedHours: null,
    parentTaskId: null,
    tags: []
  }
  formRef.value?.clearValidate()
}

const initializeForm = () => {
  if (props.task) {
    form.value = {
      title: props.task.title,
      description: props.task.description || '',
      assigneeId: props.task.assigneeId,
      priority: props.task.priority,
      dueDate: props.task.dueDate,
      estimatedHours: props.task.estimatedHours,
      parentTaskId: props.task.parentTaskId,
      tags: [...(props.task.tags || [])]
    }
  } else {
    resetForm()
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    const taskData = {
      ...form.value,
      projectId: props.projectId || props.task?.projectId
    }

    if (props.task) {
      await taskStore.updateTask(props.task.id, taskData)
      ElMessage.success('Task updated successfully')
    } else {
      await taskStore.createTask(taskData)
      ElMessage.success('Task created successfully')
    }

    emit('save', taskData)
    handleClose()
  } catch (error) {
    if (error !== false) { // Not a validation error
      console.error('Failed to save task:', error)
      ElMessage.error(props.task ? 'Failed to update task' : 'Failed to create task')
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  resetForm()
  emit('close')
}

// Watch for visibility changes to reset form
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initializeForm()
    loadProjectMembers()
  }
})

// Watch for task changes when editing
watch(() => props.task, () => {
  if (props.visible && props.task) {
    initializeForm()
  }
}, { deep: true })
</script>

<style scoped>
.member-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-name {
  font-weight: 500;
  flex: 1;
}

.member-email {
  font-size: 12px;
  color: #909399;
}

.parent-task-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.task-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tags-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
}
</style>