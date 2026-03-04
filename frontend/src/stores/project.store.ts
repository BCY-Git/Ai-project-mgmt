import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Project } from '@/types/project'
import { projectApi } from '@/api/project'
import type { CreateProjectParams, UpdateProjectParams } from '@/api/project.api'

export const useProjectStore = defineStore('project', () => {
  // State
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const currentProject = ref<Project | null>(null)

  // Getters
  const activeProjects = computed(() => {
    return projects.value.filter(p => p.status !== 'completed' && p.status !== 'archived')
  })

  const projectsByStatus = computed(() => {
    const grouped: Record<string, Project[]> = {}
    projects.value.forEach(project => {
      if (!grouped[project.status]) {
        grouped[project.status] = []
      }
      grouped[project.status]!.push(project)
    })
    return grouped
  })

  const projectById = computed(() => {
    return (id: string) => projects.value.find(p => String(p.id) === String(id))
  })

  // Actions
  const fetchProjects = async () => {
    loading.value = true
    try {
      const response = await projectApi.getProjects()
      projects.value = response.data
      ElMessage.success('Projects loaded successfully')
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      ElMessage.error('Failed to load projects')
      throw error
    } finally {
      loading.value = false
    }
  }

  const createProject = async (projectData: CreateProjectParams) => {
    loading.value = true
    try {
      const response = await projectApi.createProject(projectData)
      projects.value.push(response.data)
      ElMessage.success('Project created successfully')
      return response.data
    } catch (error) {
      console.error('Failed to create project:', error)
      const message =
        (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to create project'
      ElMessage.error(Array.isArray(message) ? message[0] : message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateProject = async (id: string, projectData: UpdateProjectParams) => {
    loading.value = true
    try {
      const response = await projectApi.updateProject(id, projectData)
      const index = projects.value.findIndex(p => String(p.id) === String(id))
      if (index !== -1) {
        projects.value[index] = response.data
      }
      if (String(currentProject.value?.id) === String(id)) {
        currentProject.value = response.data
      }
      ElMessage.success('Project updated successfully')
      return response.data
    } catch (error) {
      console.error('Failed to update project:', error)
      ElMessage.error('Failed to update project')
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteProject = async (id: string) => {
    loading.value = true
    try {
      await projectApi.deleteProject(id)
      projects.value = projects.value.filter(p => String(p.id) !== String(id))
      if (String(currentProject.value?.id) === String(id)) {
        currentProject.value = null
      }
      ElMessage.success('Project deleted successfully')
    } catch (error) {
      console.error('Failed to delete project:', error)
      ElMessage.error('Failed to delete project')
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchProject = async (id: string) => {
    loading.value = true
    try {
      const response = await projectApi.getProject(id)
      currentProject.value = response.data
      ElMessage.success('Project loaded successfully')
      return response.data
    } catch (error) {
      console.error('Failed to fetch project:', error)
      ElMessage.error('Failed to load project')
      throw error
    } finally {
      loading.value = false
    }
  }

  const clearCurrentProject = () => {
    currentProject.value = null
  }

  return {
    // State
    projects,
    loading,
    currentProject,
    // Getters
    activeProjects,
    projectsByStatus,
    projectById,
    // Actions
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    fetchProject,
    clearCurrentProject
  }
})
