import { taskApi as baseTaskApi, TaskStatus } from './task.api'
import type { CreateTaskParams, Task, UpdateTaskParams } from './task.api'
import type { AiDecomposeParams, AiDecomposeResponse } from './task.api'

type LegacyResponse<T> = { data: T }

function toTaskList(payload: unknown): Task[] {
  if (Array.isArray(payload)) return payload as Task[]
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const items = (payload as { items?: unknown }).items
    if (Array.isArray(items)) return items as Task[]
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as Task[]
  }
  return []
}

export const taskApi = {
  async getTasks(): Promise<LegacyResponse<Task[]>> {
    const payload = await baseTaskApi.list()
    return { data: toTaskList(payload) }
  },

  async getTasksByProject(projectId: string): Promise<LegacyResponse<Task[]>> {
    const payload = await baseTaskApi.list({ projectId })
    return { data: toTaskList(payload) }
  },

  async createTask(params: Partial<Task>): Promise<LegacyResponse<Task>> {
    const data = await baseTaskApi.create(params as CreateTaskParams)
    return { data }
  },

  async updateTask(id: string, params: Partial<Task>): Promise<LegacyResponse<Task>> {
    const data = await baseTaskApi.update(id, params as UpdateTaskParams)
    return { data }
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<LegacyResponse<Task>> {
    const data = await baseTaskApi.updateStatus(id, status as TaskStatus)
    return { data }
  },

  async assignTask(id: string, assigneeId: string): Promise<LegacyResponse<Task>> {
    const data = await baseTaskApi.assign(id, { assigneeId })
    return { data }
  },

  async deleteTask(id: string): Promise<void> {
    await baseTaskApi.remove(id)
  },

  async reorderTasks(params: { taskIds: string[]; parentId?: string }): Promise<void> {
    await baseTaskApi.reorder({
      taskIds: params.taskIds,
      newOrder: params.taskIds.map((_, index) => index),
      parentTaskId: params.parentId,
    })
  },

  async decomposeWithAI(params: AiDecomposeParams): Promise<LegacyResponse<AiDecomposeResponse>> {
    const data = await baseTaskApi.decompose(params)
    return { data }
  },
}
