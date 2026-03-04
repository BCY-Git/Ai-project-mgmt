import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Task } from '@/types/task'
import { taskApi } from '@/api/task'
import { useAuthStore } from './auth.store'
import type { AiDecomposeParams } from '@/api/task.api'
import { TaskStatus } from '@/api/task.api'

export interface AiDecomposeResult {
  summary: string
  totalEstimatedHours: number
  tasks: Array<Pick<Task, 'title' | 'description' | 'estimatedHours' | 'priority'>>
  jobId?: string
}

export interface DecomposeDraftTask {
  title: string
  description: string
  estimatedHours: number
  priority: Task['priority']
  selected: boolean
}

export interface DecomposeDraftResult {
  summary: string
  totalEstimatedHours: number
  tasks: DecomposeDraftTask[]
}

export interface CreateBatchResult {
  successCount: number
  failedCount: number
  failures: Array<{ title: string; reason: string }>
}

export const useTaskStore = defineStore('task', () => {
  // State
  const tasks = ref<Task[]>([])
  const taskTree = ref<Task[]>([])
  const flatTasks = ref<Task[]>([])
  const loading = ref(false)
  const aiResult = ref<AiDecomposeResult | null>(null)
  const decomposeDraft = ref<DecomposeDraftResult | null>(null)
  const decomposeStatus = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
  const isDecomposing = ref(false)
  const isCreatingBatch = ref(false)

  // Getters
  const tasksByStatus = computed(() => {
    const grouped = {
      todo: [] as Task[],
      in_progress: [] as Task[],
      review: [] as Task[],
      done: [] as Task[],
    }

    flatTasks.value.forEach(task => {
      grouped[task.status].push(task)
    })

    return grouped
  })

  const myTasks = computed(() => {
    const authStore = useAuthStore()
    return flatTasks.value.filter(task => task.assigneeId === authStore.user?.id)
  })

  const tasksByProject = computed(() => {
    return (projectId: string) => flatTasks.value.filter(task => task.projectId === projectId)
  })

  // Actions
  const fetchTasks = async () => {
    loading.value = true
    try {
      const response = await taskApi.getTasks()
      flatTasks.value = response.data
      tasks.value = response.data
      ElMessage.success('Tasks loaded successfully')
      return response.data
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      ElMessage.error('Failed to load tasks')
      throw error
    } finally {
      loading.value = false
    }
  }

  const buildTaskTree = async (projectId: string) => {
    loading.value = true
    try {
      const response = await taskApi.getTasksByProject(projectId)
      const allTasks = response.data
      flatTasks.value = allTasks
      tasks.value = allTasks

      // Build tree structure
      const taskMap = new Map<string, Task>()
      const roots: Task[] = []

      allTasks.forEach(task => {
        task.subtasks = []
        taskMap.set(task.id, task)
      })

      allTasks.forEach(task => {
        if (task.parentTaskId) {
          const parent = taskMap.get(task.parentTaskId)
          if (parent) {
            if (!parent.subtasks) parent.subtasks = []
            parent.subtasks.push(task)
          }
        } else {
          roots.push(task)
        }
      })

      taskTree.value = roots
      ElMessage.success('Task tree built successfully')
      return roots
    } catch (error) {
      console.error('Failed to build task tree:', error)
      ElMessage.error('Failed to build task tree')
      throw error
    } finally {
      loading.value = false
    }
  }

  const createTask = async (taskData: Partial<Task>) => {
    loading.value = true
    try {
      const response = await taskApi.createTask(taskData)
      const newTask = response.data
      flatTasks.value.unshift(newTask)
      tasks.value.unshift(newTask)
      ElMessage.success('Task created successfully')
      return newTask
    } catch (error) {
      console.error('Failed to create task:', error)
      const message =
        (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to create task'
      ElMessage.error(Array.isArray(message) ? message[0] : message)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateTask = async (id: string, taskData: Partial<Task>) => {
    loading.value = true
    try {
      const response = await taskApi.updateTask(id, taskData)
      const updatedTask = response.data

      // Update flatTasks
      const index = flatTasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        flatTasks.value[index] = updatedTask
      }

      // Update tasks
      const taskIndex = tasks.value.findIndex(t => t.id === id)
      if (taskIndex !== -1) {
        tasks.value[taskIndex] = updatedTask
      }

      ElMessage.success('Task updated successfully')
      return updatedTask
    } catch (error) {
      console.error('Failed to update task:', error)
      ElMessage.error('Failed to update task')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateTaskStatus = async (id: string, status: Task['status']) => {
    loading.value = true
    try {
      await taskApi.updateTaskStatus(id, status)

      // Update local state
      const task = flatTasks.value.find(t => t.id === id)
      if (task) {
        task.status = status
      }

      const task2 = tasks.value.find(t => t.id === id)
      if (task2) {
        task2.status = status
      }

      ElMessage.success('Task status updated successfully')
    } catch (error) {
      console.error('Failed to update task status:', error)
      const message =
        (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to update task status'
      const text = Array.isArray(message) ? message[0] : message
      ElMessage.error(text)
      if (typeof text === 'string' && text.includes('Task with ID') && text.includes('not found')) {
        await fetchTasks()
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  const assignTask = async (id: string, assigneeId: string) => {
    loading.value = true
    try {
      await taskApi.assignTask(id, assigneeId)

      // Update local state
      const task = flatTasks.value.find(t => t.id === id)
      if (task) {
        task.assigneeId = assigneeId
      }

      const task2 = tasks.value.find(t => t.id === id)
      if (task2) {
        task2.assigneeId = assigneeId
      }

      ElMessage.success('Task assigned successfully')
    } catch (error) {
      console.error('Failed to assign task:', error)
      const message =
        (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to assign task'
      const text = Array.isArray(message) ? message[0] : message
      ElMessage.error(text)
      if (typeof text === 'string' && text.includes('Task with ID') && text.includes('not found')) {
        await fetchTasks()
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteTask = async (id: string) => {
    loading.value = true
    try {
      await taskApi.deleteTask(id)

      flatTasks.value = flatTasks.value.filter(t => t.id !== id)
      tasks.value = tasks.value.filter(t => t.id !== id)

      ElMessage.success('Task deleted successfully')
    } catch (error) {
      console.error('Failed to delete task:', error)
      const message =
        (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to delete task'
      const text = Array.isArray(message) ? message[0] : message
      ElMessage.error(text)
      if (typeof text === 'string' && text.includes('Task with ID') && text.includes('not found')) {
        await fetchTasks()
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  const reorderTasks = async (params: { taskIds: string[]; parentId?: string }) => {
    loading.value = true
    try {
      await taskApi.reorderTasks(params)
      // Refetch tasks to get updated order
      await fetchTasks()
      ElMessage.success('Tasks reordered successfully')
    } catch (error) {
      console.error('Failed to reorder tasks:', error)
      ElMessage.error('Failed to reorder tasks')
      throw error
    } finally {
      loading.value = false
    }
  }

  // AI-related methods
  const triggerDecompose = async (params: AiDecomposeParams) => {
    if (isDecomposing.value) return aiResult.value
    isDecomposing.value = true
    decomposeStatus.value = 'loading'
    try {
      const response = await taskApi.decomposeWithAI(params)
      aiResult.value = response.data
      decomposeDraft.value = {
        summary: response.data.summary,
        totalEstimatedHours: response.data.totalEstimatedHours,
        tasks: response.data.tasks.map(task => ({
          ...task,
          selected: true,
        })),
      }
      decomposeStatus.value = 'done'
      ElMessage.success('AI decomposition completed')
      return response.data
    } catch (error) {
      console.error('Failed to decompose with AI:', error)
      decomposeStatus.value = 'error'
      const message =
        (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to decompose with AI'
      ElMessage.error(Array.isArray(message) ? message[0] : message)
      throw error
    } finally {
      isDecomposing.value = false
    }
  }

  const clearDecomposeDraft = () => {
    aiResult.value = null
    decomposeDraft.value = null
    decomposeStatus.value = 'idle'
  }

  const createTasksFromDraft = async (projectId: string): Promise<CreateBatchResult> => {
    if (!decomposeDraft.value) {
      return { successCount: 0, failedCount: 0, failures: [] }
    }
    if (isCreatingBatch.value) {
      return { successCount: 0, failedCount: 0, failures: [] }
    }

    const selectedTasks = decomposeDraft.value.tasks.filter(task => task.selected)
    if (selectedTasks.length === 0) {
      return { successCount: 0, failedCount: 0, failures: [] }
    }

    isCreatingBatch.value = true
    loading.value = true
    const result: CreateBatchResult = {
      successCount: 0,
      failedCount: 0,
      failures: [],
    }

    try {
      for (const task of selectedTasks) {
        try {
          await taskApi.createTask({
            projectId,
            title: task.title.trim(),
            description: task.description?.trim() || undefined,
            priority: task.priority,
            estimatedHours: task.estimatedHours,
            status: TaskStatus.TODO,
          })
          task.selected = false
          result.successCount += 1
        } catch (error) {
          task.selected = true
          result.failedCount += 1
          const reason =
            (error as { response?: { data?: { message?: string | string[] } }; message?: string })?.response?.data?.message ||
            (error as { message?: string })?.message ||
            '创建失败'
          const reasonText = Array.isArray(reason) ? reason[0] || '创建失败' : reason || '创建失败'
          result.failures.push({
            title: task.title,
            reason: reasonText,
          })
        }
      }
    } finally {
      loading.value = false
      isCreatingBatch.value = false
    }

    await fetchTasks()
    return result
  }

  const adoptAiResult = async (projectId: string) => {
    if (!aiResult.value) return

    loading.value = true
    try {
      // Batch create tasks
      for (const task of aiResult.value.tasks) {
        await createTask({
          ...task,
          projectId,
        })
      }

      // Mark AI result as adopted
      aiResult.value = null
      decomposeDraft.value = null
      decomposeStatus.value = 'idle'

      ElMessage.success('Tasks created successfully from AI result')
    } catch (error) {
      console.error('Failed to adopt AI result:', error)
      ElMessage.error('Failed to create tasks from AI result')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    tasks,
    taskTree,
    flatTasks,
    loading,
    aiResult,
    decomposeDraft,
    decomposeStatus,
    isDecomposing,
    isCreatingBatch,

    // Getters
    tasksByStatus,
    myTasks,
    tasksByProject,

    // Actions
    fetchTasks,
    buildTaskTree,
    createTask,
    updateTask,
    updateTaskStatus,
    assignTask,
    deleteTask,
    reorderTasks,
    triggerDecompose,
    clearDecomposeDraft,
    createTasksFromDraft,
    adoptAiResult,
  }
})
