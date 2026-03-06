import http from './http'

export interface LoginParams {
  email: string
  password: string
}

export interface RegisterParams {
  name: string
  email: string
  password: string
  role?: 'admin' | 'manager' | 'member'
}

export interface UserInfo {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'admin' | 'manager' | 'member'
  skills: string[]
  currentWorkload: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: UserInfo
  accessToken: string
  refreshToken: string
}

export const authApi = {
  login(params: LoginParams): Promise<AuthResponse> {
    return http.post('/auth/login', params)
  },

  register(params: RegisterParams): Promise<AuthResponse> {
    return http.post('/auth/register', params)
  },

  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return http.post('/auth/refresh', { refreshToken })
  },

  getCurrentUser(): Promise<UserInfo> {
    return http.get('/auth/me')
  },
}
