import http from './http'

/**
 * Task status enum matching backend TaskStatus enum
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done'
}

/**
 * Task priority enum matching backend TaskPriority enum
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Base Task interface
 */
export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  estimatedHours: number | null
  actualHours: number | null
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
  createdBy: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  project: {
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

/**
 * Parameters for creating a new task
 */
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

/**
 * Parameters for updating an existing task
 */
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

/**
 * Parameters for filtering tasks
 */
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

/**
 * Parameters for assigning a task
 */
export interface AssignTaskParams {
  assigneeId: string
}

/**
 * Parameters for reordering tasks
 */
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

/**
 * Paginated task list response
 */
export interface TaskListResponse {
  items: Task[]
  total: number
  page: number
  limit: number
}

/**
 * Task API service
 */
export const taskApi = {
  /**
   * Get a paginated list of tasks
   * @param filter - Filter parameters for the task list
   * @returns Promise<TaskListResponse>
   */
  list(filter?: TaskFilter): Promise<TaskListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', filter.page.toString())
    if (filter?.limit !== undefined) params.append('limit', filter.limit.toString())
    if (filter?.projectId) params.append('projectId', filter.projectId)
    if (filter?.assigneeId) params.append('assigneeId', filter.assigneeId)
    if (filter?.status) params.append('status', filter.status)
    if (filter?.priority) params.append('priority', filter.priority)
    if (filter?.parentTaskId) params.append('parentTaskId', filter.parentTaskId)
    if (filter?.search) params.append('search', filter.search)
    if (filter?.tags) filter.tags.forEach(tag => params.append('tags', tag))

    return http.get(`/tasks?${params.toString()}`)
  },

  /**
   * Create a new task
   * @param params - Task creation parameters
   * @returns Promise<Task>
   */
  create(params: CreateTaskParams): Promise<Task> {
    return http.post('/tasks', params)
  },

  /**
   * Get a single task by ID
   * @param id - Task ID
   * @returns Promise<Task>
   */
  get(id: string): Promise<Task> {
    return http.get(`/tasks/${id}`)
  },

  /**
   * Update an existing task
   * @param id - Task ID
   * @param params - Update parameters
   * @returns Promise<Task>
   */
  update(id: string, params: UpdateTaskParams): Promise<Task> {
    return http.patch(`/tasks/${id}`, params)
  },

  /**
   * Delete a task
   * @param id - Task ID
   * @returns Promise<void>
   */
  remove(id: string): Promise<void> {
    return http.delete(`/tasks/${id}`)
  },

  /**
   * Update the status of a task
   * @param id - Task ID
   * @param status - New status
   * @returns Promise<Task>
   */
  updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return http.patch(`/tasks/${id}/status`, { status })
  },

  /**
   * Assign a task to a user
   * @param id - Task ID
   * @param params - Assignment parameters
   * @returns Promise<Task>
   */
  assign(id: string, params: AssignTaskParams): Promise<Task> {
    return http.patch(`/tasks/${id}/assign`, params)
  },

  /**
   * Reorder tasks
   * @param params - Reorder parameters
   * @returns Promise<void>
   */
  reorder(params: ReorderParams): Promise<void> {
    const tasks = params.taskIds.map((id, index) => ({
      id,
      sortOrder: params.newOrder[index] ?? index,
      parentTaskId: params.parentTaskId,
    }))
    return http.post('/tasks/reorder', { tasks })
  },

  /**
   * Get tasks assigned to the current user
   * @param filter - Optional filter parameters
   * @returns Promise<TaskListResponse>
   */
  getMyTasks(filter?: Omit<TaskFilter, 'assigneeId'>): Promise<TaskListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', filter.page.toString())
    if (filter?.limit !== undefined) params.append('limit', filter.limit.toString())
    if (filter?.projectId) params.append('projectId', filter.projectId)
    if (filter?.status) params.append('status', filter.status)
    if (filter?.priority) params.append('priority', filter.priority)
    if (filter?.parentTaskId) params.append('parentTaskId', filter.parentTaskId)
    if (filter?.search) params.append('search', filter.search)
    if (filter?.tags) filter.tags.forEach(tag => params.append('tags', tag))

    return http.get(`/tasks/my?${params.toString()}`)
  },

  decompose(params: AiDecomposeParams): Promise<AiDecomposeResponse> {
    if (!params.file) {
      return http.post('/tasks/ai/decompose', params)
    }

    const formData = new FormData()
    if (params.projectId) formData.append('projectId', params.projectId)
    if (params.inputMode) formData.append('inputMode', params.inputMode)
    if (params.projectDescription) formData.append('projectDescription', params.projectDescription)
    if (params.projectName) formData.append('projectName', params.projectName)
    if (params.maxTasks !== undefined) formData.append('maxTasks', String(params.maxTasks))
    formData.append('file', params.file)
    return http.post('/tasks/ai/decompose', formData)
  }
}
