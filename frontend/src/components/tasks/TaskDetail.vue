<template>
  <div class="task-detail">
    <div class="task-header">
      <div class="task-status-priority">
        <el-tag :type="getStatusType(task.status)" size="large">
          {{ getStatusLabel(task.status) }}
        </el-tag>
        <el-tag :type="getPriorityType(task.priority)" size="large" effect="dark">
          {{ getPriorityLabel(task.priority) }}
        </el-tag>
      </div>
      <div class="task-actions">
        <el-button type="primary" plain @click="$emit('edit')">编辑</el-button>
        <el-button type="danger" plain @click="handleDelete">删除</el-button>
      </div>
    </div>

    <el-divider />

    <div class="task-content">
      <h2>{{ task.title }}</h2>
      <p v-if="task.description" class="task-description">{{ task.description }}</p>

      <el-row :gutter="20" class="task-meta">
        <el-col :span="8">
          <div class="meta-item">
            <label>负责人：</label>
            <div v-if="task.assignee" class="assignee-info">
              <el-avatar :size="32" :src="task.assignee.avatar">
                {{ task.assignee.name.charAt(0) }}
              </el-avatar>
              <span>{{ task.assignee.name }}</span>
            </div>
            <span v-else class="no-assignee">未分配</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="meta-item">
            <label>创建者：</label>
            <span>{{ task.createdBy.name }}</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="meta-item">
            <label>创建时间：</label>
            <span>{{ formatDate(task.createdAt) }}</span>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="task-meta">
        <el-col :span="8">
          <div class="meta-item">
            <label>预估工时：</label>
            <span>{{ task.estimatedHours || '-' }} 小时</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="meta-item">
            <label>实际工时：</label>
            <span>{{ task.actualHours || '-' }} 小时</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="meta-item">
            <label>截止日期：</label>
            <span v-if="task.dueDate">{{ formatDate(task.dueDate) }}</span>
            <span v-else>-</span>
          </div>
        </el-col>
      </el-row>

      <div v-if="task.tags && task.tags.length > 0" class="task-tags">
        <label>标签：</label>
        <el-tag
          v-for="tag in task.tags"
          :key="tag"
          size="small"
          style="margin-right: 8px"
        >
          {{ tag }}
        </el-tag>
      </div>

      <div v-if="task.parentTask" class="parent-task-info">
        <label>父任务：</label>
        <el-link @click="$emit('openTask', task.parentTask.id)">
          {{ task.parentTask.title }}
        </el-link>
      </div>
    </div>

    <!-- Subtasks Section -->
    <div v-if="task.subtasks && task.subtasks.length > 0" class="subtasks-section">
      <el-divider />
      <h3>子任务 ({{ getCompletedSubtasksCount(task) }}/{{ task.subtasks.length }})</h3>
      <el-progress
        :percentage="getCompletionPercentage(task)"
        :show-text="true"
        :stroke-width="8"
        style="margin-bottom: 20px"
      />
      <div class="subtasks-list">
        <div
          v-for="subtask in task.subtasks"
          :key="subtask.id"
          class="subtask-item"
          @click="$emit('openTask', subtask.id)"
        >
          <div class="subtask-info">
            <el-checkbox
              :checked="subtask.status === 'done'"
              @click.stop="toggleSubtaskStatus(subtask)"
            />
            <span class="subtask-title">{{ subtask.title }}</span>
            <el-tag :type="getStatusType(subtask.status)" size="small">
              {{ getStatusLabel(subtask.status) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- Dependencies Section -->
    <div v-if="task.dependencies && task.dependencies.length > 0" class="dependencies-section">
      <el-divider />
      <h3>依赖于这些任务</h3>
      <div class="dependencies-list">
        <el-link
          v-for="dep in task.dependencies"
          :key="dep.id"
          @click="$emit('openTask', dep.id)"
          class="dependency-link"
        >
          {{ dep.title }}
        </el-link>
      </div>
    </div>

    <!-- Dependent Tasks Section -->
    <div v-if="task.dependentOn && task.dependentOn.length > 0" class="dependent-section">
      <el-divider />
      <h3>被这些任务依赖</h3>
      <div class="dependencies-list">
        <el-link
          v-for="dep in task.dependentOn"
          :key="dep.id"
          @click="$emit('openTask', dep.id)"
          class="dependency-link"
        >
          {{ dep.title }}
        </el-link>
      </div>
    </div>

    <!-- Comments Section -->
    <el-divider />
    <div class="comments-section">
      <h3>评论</h3>
      <div class="comment-input">
        <el-input
          v-model="newComment"
          type="textarea"
          :rows="3"
          placeholder="添加评论..."
        />
        <el-button
          type="primary"
          @click="addComment"
          :loading="commentLoading"
          style="margin-top: 10px"
        >
          发表评论
        </el-button>
      </div>
      <div v-if="comments.length > 0" class="comments-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <el-avatar :size="32" :src="comment.user.avatar">
              {{ comment.user.name.charAt(0) }}
            </el-avatar>
            <div class="comment-meta">
              <span class="comment-author">{{ comment.user.name }}</span>
              <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
            </div>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
        </div>
      </div>
    </div>

    <el-button @click="$emit('close')" style="margin-top: 20px">关闭</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTaskStore } from '@/stores/task.store'
import type { Task } from '@/api/task.api'

interface Props {
  task: Task
}

interface Emits {
  (e: 'task-updated', task: Task): void
  (e: 'task-deleted'): void
  (e: 'close'): void
  (e: 'edit'): void
  (e: 'openTask', taskId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const newComment = ref('')
const commentLoading = ref(false)
const comments = ref<any[]>([])

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    todo: 'info',
    in_progress: 'primary',
    review: 'warning',
    done: 'success'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    todo: '待处理',
    in_progress: '进行中',
    review: '待审核',
    done: '已完成'
  }
  return labels[status] || status
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
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？', '确认删除', {
      type: 'warning'
    })
    await taskStore.deleteTask(props.task.id)
    ElMessage.success('任务删除成功')
    emit('task-deleted')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除任务失败')
    }
  }
}

const toggleSubtaskStatus = async (subtask: Task) => {
  const newStatus = subtask.status === 'done' ? 'todo' : 'done'
  try {
    await taskStore.updateTaskStatus(subtask.id, newStatus)
    ElMessage.success('子任务状态更新成功')
    emit('task-updated', props.task)
  } catch (error) {
    ElMessage.error('更新子任务状态失败')
  }
}

const addComment = async () => {
  if (!newComment.value.trim()) return

  commentLoading.value = true
  try {
    // Mock comment addition
    comments.value.push({
      id: Date.now().toString(),
      content: newComment.value,
      createdAt: new Date().toISOString(),
      user: {
        id: '1',
        name: '当前用户',
        avatar: ''
      }
    })
    newComment.value = ''
    ElMessage.success('评论添加成功')
  } catch (error) {
    ElMessage.error('添加评论失败')
  } finally {
    commentLoading.value = false
  }
}
</script>

<style scoped>
.task-detail {
  padding: 20px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-status-priority {
  display: flex;
  gap: 10px;
}

.task-content {
  margin-bottom: 30px;
}

.task-content h2 {
  margin: 0 0 15px 0;
  color: #303133;
}

.task-description {
  color: #606266;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.task-meta {
  margin-bottom: 15px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item label {
  font-weight: 500;
  color: #909399;
  font-size: 12px;
}

.assignee-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-assignee {
  color: #c0c4cc;
}

.task-tags {
  margin-bottom: 15px;
}

.task-tags label {
  font-weight: 500;
  color: #909399;
  margin-right: 10px;
}

.parent-task-info {
  margin-bottom: 15px;
}

.parent-task-info label {
  font-weight: 500;
  color: #909399;
  margin-right: 10px;
}

.subtasks-section {
  margin-bottom: 30px;
}

.subtasks-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subtask-item {
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.subtask-item:hover {
  background-color: #ecf5ff;
}

.subtask-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtask-title {
  flex: 1;
  color: #303133;
}

.dependencies-section,
.dependent-section {
  margin-bottom: 30px;
}

.dependencies-section h3,
.dependent-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.dependencies-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dependency-link {
  margin-bottom: 5px;
}

.comments-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.comment-input {
  margin-bottom: 20px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.comment-item {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.comment-meta {
  display: flex;
  flex-direction: column;
}

.comment-author {
  font-weight: 500;
  color: #303133;
}

.comment-time {
  font-size: 12px;
  color: #909399;
}

.comment-content {
  color: #606266;
  line-height: 1.5;
  padding-left: 42px;
}
</style>