import http from './http'

export enum ProjectStatus {
  DRAFT = 'draft',
  DECOMPOSING = 'decomposing',
  REVIEWING = 'reviewing',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  deadline: string | null
  ownerId?: string
  createdById: string
  createdBy?: {
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

export interface CreateProjectParams {
  name: string
  description?: string
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  deadline?: string
  memberIds?: string[]
}

export interface UpdateProjectParams {
  name?: string
  description?: string
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  deadline?: string
  memberIds?: string[]
}

export interface ProjectFilter {
  page?: number
  limit?: number
  status?: ProjectStatus
  search?: string
}

export interface ProjectListResponse {
  items: Project[]
  total: number
  page: number
  limit: number
}

function normalizeProjectList(payload: unknown): ProjectListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as Project[],
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
    projects?: unknown
    total?: unknown
    page?: unknown
    limit?: unknown
  }

  const items = Array.isArray(obj.items)
    ? (obj.items as Project[])
    : Array.isArray(obj.projects)
      ? (obj.projects as Project[])
      : []

  const total = Number(obj.total)
  const page = Number(obj.page)
  const limit = Number(obj.limit)

  return {
    items,
    total: Number.isFinite(total) && total >= 0 ? total : items.length,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
  }
}

export const projectApi = {
  async list(filter?: ProjectFilter): Promise<ProjectListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', String(filter.page))
    if (filter?.limit !== undefined) params.append('limit', String(filter.limit))
    if (filter?.status) params.append('status', filter.status)
    if (filter?.search) params.append('search', filter.search)

    const payload = await http.get(`/projects?${params.toString()}`)
    return normalizeProjectList(payload)
  },

  create(params: CreateProjectParams): Promise<Project> {
    return http.post('/projects', params)
  },

  get(id: string): Promise<Project> {
    return http.get(`/projects/${id}`)
  },

  update(id: string, params: UpdateProjectParams): Promise<Project> {
    return http.patch(`/projects/${id}`, params)
  },

  remove(id: string): Promise<void> {
    return http.delete(`/projects/${id}`)
  },

  async getMyProjects(filter?: Omit<ProjectFilter, 'search'>): Promise<ProjectListResponse> {
    const params = new URLSearchParams()
    if (filter?.page !== undefined) params.append('page', String(filter.page))
    if (filter?.limit !== undefined) params.append('limit', String(filter.limit))
    if (filter?.status) params.append('status', filter.status)

    const payload = await http.get(`/projects/my?${params.toString()}`)
    return normalizeProjectList(payload)
  },
}
