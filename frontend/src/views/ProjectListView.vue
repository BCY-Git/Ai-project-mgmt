<template>
  <div class="project-list-page">
    <section class="toolbar">
      <div>
        <h1>项目中心</h1>
        <p>管理项目生命周期，追踪状态并快速进入执行。</p>
      </div>
      <div class="toolbar-actions">
        <el-input v-model="keyword" placeholder="搜索项目名" clearable class="search-input" />
        <el-button type="primary" @click="showCreateDialog = true">新建项目</el-button>
      </div>
    </section>

    <el-row :gutter="16">
      <el-col v-for="project in filteredProjects" :key="project.id" :xs="24" :sm="12" :xl="8">
        <el-card class="project-card" shadow="never" @click="$router.push(`/projects/${project.id}`)">
          <div class="card-top">
            <h3>{{ project.name }}</h3>
            <el-tag :type="getProjectStatusType(project.status)" size="small">{{ getProjectStatusText(project.status) }}</el-tag>
          </div>
          <p class="description">{{ project.description || '暂无描述' }}</p>
          <div class="meta">
            <span>创建于 {{ formatDate(project.createdAt) }}</span>
            <span v-if="project.deadline">截止 {{ formatDate(project.deadline) }}</span>
          </div>
          <div class="members" v-if="project.members?.length">
            <el-avatar v-for="member in project.members.slice(0, 4)" :key="member.id" :size="24">
              {{ member.name?.charAt(0) || member.email?.charAt(0) }}
            </el-avatar>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!projectStore.loading && filteredProjects.length === 0" description="暂无匹配项目" />

    <el-dialog v-model="showCreateDialog" title="新建项目" width="520px">
      <el-form :model="createForm" label-width="90px">
        <el-form-item label="项目名称" required>
          <el-input v-model="createForm.name" placeholder="例如：营销自动化平台" />
        </el-form-item>
        <el-form-item label="项目描述" required>
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="4"
            placeholder="描述项目目标、关键结果和范围"
          />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="createForm.deadline"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择截止日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="loading">创建项目</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProjectStore } from '@/stores/project.store'
import { ElMessage } from 'element-plus'
import type { Project } from '@/api/project.api'

const projectStore = useProjectStore()

const showCreateDialog = ref(false)
const keyword = ref('')
const loading = computed(() => projectStore.loading)

const createForm = ref({
  name: '',
  description: '',
  deadline: '',
})

const filteredProjects = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return projectStore.projects
  return projectStore.projects.filter(project => {
    const name = project.name?.toLowerCase() || ''
    const desc = project.description?.toLowerCase() || ''
    return name.includes(text) || desc.includes(text)
  })
})

onMounted(async () => {
  await projectStore.fetchProjects()
})

const handleCreate = async () => {
  if (!createForm.value.name || !createForm.value.description) {
    ElMessage.warning('请填写项目名称和描述')
    return
  }

  const payload: { name: string; description: string; deadline?: string } = {
    name: createForm.value.name,
    description: createForm.value.description,
  }

  if (createForm.value.deadline) {
    payload.deadline = new Date(`${createForm.value.deadline}T00:00:00`).toISOString()
  }

  try {
    await projectStore.createProject(payload)
    showCreateDialog.value = false
    createForm.value = { name: '', description: '', deadline: '' }
  } catch (_error) {
    // Store has displayed error message.
  }
}

const getProjectStatusType = (status: Project['status']) => {
  const map: Record<Project['status'], string> = {
    draft: 'info',
    decomposing: 'warning',
    reviewing: 'warning',
    active: 'success',
    completed: '',
    archived: 'info',
  }
  return map[status]
}

const getProjectStatusText = (status: Project['status']) => {
  const map: Record<Project['status'], string> = {
    draft: '草稿',
    decomposing: 'AI拆解中',
    reviewing: '待审核',
    active: '进行中',
    completed: '已完成',
    archived: '已归档',
  }
  return map[status]
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN')
</script>

<style scoped>
.project-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.toolbar h1 {
  margin: 0;
  font-size: 24px;
}

.toolbar p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.search-input {
  width: 260px;
}

.project-card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  cursor: pointer;
  min-height: 192px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-top h3 {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.description {
  margin-top: 10px;
  min-height: 40px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.meta {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.members {
  margin-top: 12px;
  display: flex;
  gap: 6px;
}

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-actions {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }
}
</style>
