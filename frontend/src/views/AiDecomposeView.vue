<template>
  <div class="ai-decompose-page">
    <el-card class="input-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>AI 一键分解</span>
          <el-tag type="info">项目: {{ projectStore.currentProject?.name || projectId }}</el-tag>
        </div>
      </template>

      <el-form label-position="top" class="input-form">
        <el-form-item label="输入方式">
          <el-radio-group v-model="form.inputMode">
            <el-radio-button label="prompt">提示词</el-radio-button>
            <el-radio-button label="paste">粘贴文档</el-radio-button>
            <el-radio-button label="file">文件上传</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="项目名称(可选)">
          <el-input v-model="form.projectName" placeholder="例如：智能客服系统" />
        </el-form-item>

        <el-form-item label="最大任务数">
          <el-input-number v-model="form.maxTasks" :min="3" :max="20" />
        </el-form-item>

        <el-form-item v-if="form.inputMode !== 'file'" :label="form.inputMode === 'prompt' ? '提示词' : '文档内容'">
          <el-input
            v-model="form.projectDescription"
            type="textarea"
            :rows="10"
            placeholder="请输入需求背景、目标、范围、约束和验收标准..."
          />
        </el-form-item>

        <el-form-item v-else label="上传需求文件 (txt/md/docx/pdf, <=10MB)">
          <el-upload
            drag
            :auto-upload="false"
            :limit="1"
            accept=".txt,.md,.docx,.pdf"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="uploadFileList"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到这里，或 <em>点击上传</em></div>
          </el-upload>
          <div v-if="selectedFile" class="file-tip">已选择: {{ selectedFile.name }}</div>
        </el-form-item>

        <div class="action-row">
          <el-button type="primary" :loading="taskStore.isDecomposing" @click="handleDecompose">一键分解</el-button>
          <el-button :disabled="taskStore.isDecomposing" @click="resetForm">重置输入</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card v-if="draft" class="result-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>拆解结果预览</span>
          <div class="result-actions">
            <el-tag type="success">总工时: {{ draft.totalEstimatedHours }}h</el-tag>
            <el-tag type="warning">已选: {{ selectedCount }}/{{ draft.tasks.length }}</el-tag>
          </div>
        </div>
      </template>

      <el-alert :closable="false" type="success" show-icon :title="draft.summary" class="summary-alert" />

      <el-table :data="draft.tasks" border class="result-table">
        <el-table-column label="入库" width="70" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.selected" />
          </template>
        </el-table-column>

        <el-table-column label="任务标题" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.title" placeholder="任务标题" />
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="280">
          <template #default="{ row }">
            <el-input v-model="row.description" type="textarea" :rows="2" placeholder="任务描述" />
          </template>
        </el-table-column>

        <el-table-column label="优先级" width="130">
          <template #default="{ row }">
            <el-select v-model="row.priority">
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
              <el-option label="紧急" value="urgent" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="预估工时" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.estimatedHours" :min="1" :max="999" :step="1" />
          </template>
        </el-table-column>
      </el-table>

      <div class="action-row">
        <el-button
          type="primary"
          :loading="taskStore.isCreatingBatch"
          :disabled="selectedCount === 0"
          @click="handleCreateFromDraft"
        >
          一键创建任务
        </el-button>
        <el-button
          v-if="batchResult && batchResult.failedCount > 0"
          type="warning"
          plain
          :loading="taskStore.isCreatingBatch"
          :disabled="selectedCount === 0"
          @click="retryFailedOnly"
        >
          仅重试失败项
        </el-button>
        <el-button :disabled="taskStore.isCreatingBatch" @click="taskStore.clearDecomposeDraft()">清空结果</el-button>
        <el-button type="success" plain @click="goBoard">前往任务看板</el-button>
      </div>

      <el-alert
        v-if="batchResult"
        :type="batchResult.failedCount > 0 ? 'warning' : 'success'"
        :closable="false"
        show-icon
        class="batch-result"
      >
        <template #title>
          创建完成：成功 {{ batchResult.successCount }} 条，失败 {{ batchResult.failedCount }} 条
        </template>
        <template #default>
          <div v-if="batchResult.failures.length > 0">
            <div v-for="item in batchResult.failures" :key="`${item.title}-${item.reason}`" class="failure-item">
              {{ item.title }}：{{ item.reason }}
            </div>
          </div>
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type UploadFile, type UploadFiles, type UploadRawFile } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useTaskStore } from '@/stores/task.store'
import type { CreateBatchResult } from '@/stores/task.store'
import { useProjectStore } from '@/stores/project.store'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

const projectId = route.params.id as string

const form = reactive({
  inputMode: 'prompt' as 'prompt' | 'paste' | 'file',
  projectName: '',
  projectDescription: '',
  maxTasks: 8,
})

const selectedFile = ref<File | null>(null)
const uploadFileList = ref<UploadFiles>([])
const batchResult = ref<CreateBatchResult | null>(null)

const draft = computed(() => taskStore.decomposeDraft)
const selectedCount = computed(() => draft.value?.tasks.filter(task => task.selected).length || 0)

onMounted(async () => {
  try {
    await projectStore.fetchProject(projectId)
    if (projectStore.currentProject?.name) {
      form.projectName = projectStore.currentProject.name
    }
    if (projectStore.currentProject?.description) {
      form.projectDescription = projectStore.currentProject.description
    }
  } catch (_error) {
    ElMessage.error('加载项目信息失败')
  }
})

const handleFileChange = (_file: UploadFile, files: UploadFiles) => {
  const latest = files.slice(-1)
  const raw = latest[0]?.raw as UploadRawFile | undefined
  if (raw && raw.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    uploadFileList.value = []
    selectedFile.value = null
    return
  }

  const name = raw?.name?.toLowerCase() || ''
  const allowed = ['.txt', '.md', '.docx', '.pdf']
  if (raw && !allowed.some(ext => name.endsWith(ext))) {
    ElMessage.error('仅支持 txt/md/docx/pdf 文件')
    uploadFileList.value = []
    selectedFile.value = null
    return
  }

  uploadFileList.value = latest
  selectedFile.value = (raw as File) || null
}

const handleFileRemove = () => {
  uploadFileList.value = []
  selectedFile.value = null
}

const handleDecompose = async () => {
  batchResult.value = null

  if (form.inputMode === 'file' && !selectedFile.value) {
    ElMessage.warning('请先上传文件')
    return
  }

  if (form.inputMode !== 'file' && !form.projectDescription.trim()) {
    ElMessage.warning('请输入需求内容')
    return
  }

  const payload = {
    projectId,
    inputMode: form.inputMode,
    projectName: form.projectName || undefined,
    projectDescription: form.inputMode === 'file' ? undefined : form.projectDescription,
    maxTasks: form.maxTasks,
    file: form.inputMode === 'file' ? selectedFile.value || undefined : undefined,
  } as const

  try {
    await Promise.race([
      taskStore.triggerDecompose(payload),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI 拆解超时，请稍后重试（已自动取消等待）')), 65000),
      ),
    ])
  } catch (_error) {
    // store handles most errors; this handles local timeout fallback.
    if (_error instanceof Error && _error.message.includes('超时')) {
      ElMessage.error(_error.message)
    }
  }
}

const handleCreateFromDraft = async () => {
  if (selectedCount.value === 0) {
    ElMessage.warning('请至少选择一条任务')
    return
  }

  try {
    batchResult.value = await taskStore.createTasksFromDraft(projectId)
    if (batchResult.value.failedCount === 0 && batchResult.value.successCount > 0) {
      ElMessage.success('任务已全部创建成功')
    }
  } catch (_error) {
    ElMessage.error('批量创建失败')
  }
}

const retryFailedOnly = async () => {
  if (!draft.value || !batchResult.value) return
  const failedTitles = new Set(batchResult.value.failures.map(item => item.title))
  draft.value.tasks.forEach(task => {
    task.selected = failedTitles.has(task.title)
  })
  await handleCreateFromDraft()
}

const goBoard = () => {
  router.push(`/projects/${projectId}/board`)
}

const resetForm = () => {
  form.inputMode = 'prompt'
  form.projectDescription = projectStore.currentProject?.description || ''
  form.projectName = projectStore.currentProject?.name || ''
  form.maxTasks = 8
  selectedFile.value = null
  uploadFileList.value = []
  batchResult.value = null
}
</script>

<style scoped>
.ai-decompose-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-card,
.result-card {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.input-form {
  max-width: 100%;
}

.file-tip {
  margin-top: 8px;
  color: #5e6c84;
  font-size: 12px;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.summary-alert {
  margin-bottom: 12px;
}

.result-table {
  margin-top: 12px;
}

.batch-result {
  margin-top: 12px;
}

.failure-item {
  font-size: 13px;
  color: #7a4b00;
}
</style>
