import { projectApi as baseProjectApi } from './project.api'
import type { CreateProjectParams, Project, UpdateProjectParams } from './project.api'

type LegacyResponse<T> = { data: T }

function toProjectList(payload: unknown): Project[] {
  if (Array.isArray(payload)) return payload as Project[]
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const items = (payload as { items?: unknown }).items
    if (Array.isArray(items)) return items as Project[]
  }
  if (payload && typeof payload === 'object' && 'projects' in payload) {
    const projects = (payload as { projects?: unknown }).projects
    if (Array.isArray(projects)) return projects as Project[]
  }
  return []
}

export const projectApi = {
  async getProjects(): Promise<LegacyResponse<Project[]>> {
    const payload = await baseProjectApi.list()
    return { data: toProjectList(payload) }
  },

  async getProject(id: string): Promise<LegacyResponse<Project>> {
    const data = await baseProjectApi.get(id)
    return { data }
  },

  async createProject(params: CreateProjectParams): Promise<LegacyResponse<Project>> {
    const data = await baseProjectApi.create(params)
    return { data }
  },

  async updateProject(id: string, params: UpdateProjectParams): Promise<LegacyResponse<Project>> {
    const data = await baseProjectApi.update(id, params)
    return { data }
  },

  async deleteProject(id: string): Promise<void> {
    await baseProjectApi.remove(id)
  },
}
