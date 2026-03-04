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
  role: string
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
  // 登录
  login(params: LoginParams): Promise<AuthResponse> {
    return http.post('/auth/login', params)
  },

  // 注册
  register(params: RegisterParams): Promise<AuthResponse> {
    return http.post('/auth/register', params)
  },

  // 刷新Token
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return http.post('/auth/refresh', { refreshToken })
  },

  // 获取当前用户信息
  getCurrentUser(): Promise<UserInfo> {
    return http.get('/auth/me')
  },
}
