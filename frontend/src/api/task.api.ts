import http from './http'

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  estimatedHours: number | null
  actualHours: number | null
  dueDate?: string | null
  projectId: string
  parentTaskId: string | null
  assigneeId: string | null
  createdById: string
  tags: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  assignee?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  createdBy?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  project?: {
    id: string
    name: string
  }
  parentTask?: {
    id: string
    title: string
  }
  subtasks: Task[]
  dependencies: Task[]
  dependentOn: Task[]
}

export interface CreateTaskParams {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  estimatedHours?: number
  projectId: string
  parentTaskId?: string
  assigneeId?: string
  tags?: string[]
  dependencyIds?: string[]
}

export interface UpdateTaskParams {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  estimatedHours?: number
  actualHours?: number
  assigneeId?: string
  tags?: string[]
}

export interface TaskFilter {
  page?: number
  limit?: number
  projectId?: string
  assigneeId?: string
  status?: TaskStatus
  priority?: TaskPriority
  parentTaskId?: string
  search?: string
  tags?: string[]
}

export interface AssignTaskParams {
  assigneeId?: string
}

export interface ReorderParams {
  taskIds: string[]
  newOrder: number[]
  parentTaskId?: string
}

export interface AiDecomposeParams {
  projectId?: string
  inputMode?: 'prompt' | 'paste' | 'file'
  projectDescription?: string
  projectName?: string
  maxTasks?: number
  file?: File
}

export interface AiDecomposeTask {
  title: string
  description: string
  estimatedHours: number
  priority: TaskPriority
}

export interface AiDecomposeResponse {
  summary: string
  totalEstimatedHours: number
  tasks: AiDecomposeTask[]
}

export interface TaskListResponse {
  items: Task[]
  total: number
  page: number
  limit: number
}

function normalizeTaskList(payload: unknown): TaskListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as Task[],
      total: payload.length,
      page: 1,
      limit: payload.length,
    }
  }

  if (!payload || typeof payload !== 'object') {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    }
  }

  const obj = payload as {
    items?: unknown
    data?: unknown
    total?: unknown
    page?: unknown
    limit?: unknown
    meta?: { total?: unknown; page?: unknown; limit?: unknown }
  }

  const items = Array.isArray(obj.items)
    ? (obj.items as Task[])
    : Array.isArray(obj.data)
      ? (obj.data as Task[])
      : []

  const meta = obj.meta || {}
  const total = Number(meta.total ?? obj.total)
  const page = Number(meta.page ?? obj.page)
  const limit = Number(meta.limit ?? obj.limit)

  return {
    items,
    total: Number.isFinite(total) && total >= 0 ? total : items.length,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
  }
}

export const taskApi = {
  async list(filter?: TaskFilter): Promise<TaskListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', String(filter.page))
    if (filter?.limit !== undefined) params.append('limit', String(filter.limit))
    if (filter?.projectId) params.append('projectId', filter.projectId)
    if (filter?.assigneeId) params.append('assigneeId', filter.assigneeId)
    if (filter?.status) params.append('status', filter.status)
    if (filter?.priority) params.append('priority', filter.priority)
    if (filter?.parentTaskId) params.append('parentTaskId', filter.parentTaskId)
    if (filter?.search) params.append('search', filter.search)
    if (filter?.tags) filter.tags.forEach((tag) => params.append('tags', tag))

    const payload = await http.get(`/tasks?${params.toString()}`)
    return normalizeTaskList(payload)
  },

  create(params: CreateTaskParams): Promise<Task> {
    return http.post('/tasks', params)
  },

  get(id: string): Promise<Task> {
    return http.get(`/tasks/${id}`)
  },

  update(id: string, params: UpdateTaskParams): Promise<Task> {
    return http.patch(`/tasks/${id}`, params)
  },

  remove(id: string): Promise<void> {
    return http.delete(`/tasks/${id}`)
  },

  updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return http.patch(`/tasks/${id}/status`, { status })
  },

  assign(id: string, params: AssignTaskParams): Promise<Task> {
    return http.patch(`/tasks/${id}/assign`, params)
  },

  reorder(params: ReorderParams): Promise<void> {
    const tasks = params.taskIds.map((id, index) => ({
      id,
      sortOrder: params.newOrder[index] ?? index,
      parentTaskId: params.parentTaskId,
    }))
    return http.post('/tasks/reorder', { tasks })
  },

  async getMyTasks(filter?: Omit<TaskFilter, 'assigneeId'>): Promise<TaskListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', String(filter.page))
    if (filter?.limit !== undefined) params.append('limit', String(filter.limit))
    if (filter?.projectId) params.append('projectId', filter.projectId)
    if (filter?.status) params.append('status', filter.status)
    if (filter?.priority) params.append('priority', filter.priority)
    if (filter?.parentTaskId) params.append('parentTaskId', filter.parentTaskId)
    if (filter?.search) params.append('search', filter.search)
    if (filter?.tags) filter.tags.forEach((tag) => params.append('tags', tag))

    const payload = await http.get(`/tasks/my?${params.toString()}`)
    return normalizeTaskList(payload)
  },

  decompose(params: AiDecomposeParams): Promise<AiDecomposeResponse> {
    if (!params.file) {
      return http.post('/tasks/ai/decompose', params, { timeout: 70000 })
    }

    const formData = new FormData()
    if (params.projectId) formData.append('projectId', params.projectId)
    if (params.inputMode) formData.append('inputMode', params.inputMode)
    if (params.projectDescription) formData.append('projectDescription', params.projectDescription)
    if (params.projectName) formData.append('projectName', params.projectName)
    if (params.maxTasks !== undefined) formData.append('maxTasks', String(params.maxTasks))
    formData.append('file', params.file)

    return http.post('/tasks/ai/decompose', formData, { timeout: 70000 })
  },
}
