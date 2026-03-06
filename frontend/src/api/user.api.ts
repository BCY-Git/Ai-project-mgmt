import http from './http'

export interface TeamUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'member'
  skills: string[]
  currentWorkload: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UpdateSkillsParams = {
  skills: string[]
}

export const userApi = {
  list(): Promise<TeamUser[]> {
    return http.get('/users')
  },

  updateSkills(id: string, params: UpdateSkillsParams): Promise<TeamUser> {
    return http.put(`/users/${id}/skills`, params)
  },

  getUserTasks(id: string): Promise<unknown[]> {
    return http.get(`/users/${id}/tasks`)
  },
}
