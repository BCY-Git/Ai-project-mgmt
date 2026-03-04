import http from './http'

/**
 * Project status enum matching backend ProjectStatus enum
 */
export enum ProjectStatus {
  DRAFT = 'draft',
  DECOMPOSING = 'decomposing',
  REVIEWING = 'reviewing',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * Base Project interface
 */
export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  deadline: string | null
  createdById: string
  createdBy: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  members: Array<{
    id: string
    name: string
    email: string
    avatar?: string
  }>
  createdAt: string
  updatedAt: string
  _count?: {
    tasks: number
  }
}

/**
 * Parameters for creating a new project
 */
export interface CreateProjectParams {
  name: string
  description?: string
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  deadline?: string
  memberIds?: string[]
}

/**
 * Parameters for updating an existing project
 */
export interface UpdateProjectParams {
  name?: string
  description?: string
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  deadline?: string
  memberIds?: string[]
}

/**
 * Parameters for filtering projects
 */
export interface ProjectFilter {
  page?: number
  limit?: number
  status?: ProjectStatus
  search?: string
}

/**
 * Paginated project list response
 */
export interface ProjectListResponse {
  items: Project[]
  total: number
  page: number
  limit: number
}

/**
 * Project API service
 */
export const projectApi = {
  /**
   * Get a paginated list of projects
   * @param filter - Filter parameters for the project list
   * @returns Promise<ProjectListResponse>
   */
  list(filter?: ProjectFilter): Promise<ProjectListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', filter.page.toString())
    if (filter?.limit !== undefined) params.append('limit', filter.limit.toString())
    if (filter?.status) params.append('status', filter.status)
    if (filter?.search) params.append('search', filter.search)

    return http.get(`/projects?${params.toString()}`)
  },

  /**
   * Create a new project
   * @param params - Project creation parameters
   * @returns Promise<Project>
   */
  create(params: CreateProjectParams): Promise<Project> {
    return http.post('/projects', params)
  },

  /**
   * Get a single project by ID
   * @param id - Project ID
   * @returns Promise<Project>
   */
  get(id: string): Promise<Project> {
    return http.get(`/projects/${id}`)
  },

  /**
   * Update an existing project
   * @param id - Project ID
   * @param params - Update parameters
   * @returns Promise<Project>
   */
  update(id: string, params: UpdateProjectParams): Promise<Project> {
    return http.patch(`/projects/${id}`, params)
  },

  /**
   * Delete a project
   * @param id - Project ID
   * @returns Promise<void>
   */
  remove(id: string): Promise<void> {
    return http.delete(`/projects/${id}`)
  },

  /**
   * Get projects that the current user is a member of
   * @param filter - Optional filter parameters
   * @returns Promise<ProjectListResponse>
   */
  getMyProjects(filter?: Omit<ProjectFilter, 'search'>): Promise<ProjectListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', filter.page.toString())
    if (filter?.limit !== undefined) params.append('limit', filter.limit.toString())
    if (filter?.status) params.append('status', filter.status)

    return http.get(`/projects/my?${params.toString()}`)
  }
}
