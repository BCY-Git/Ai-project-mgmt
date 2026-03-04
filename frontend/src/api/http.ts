import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.store'

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type']
    }
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 0) {
      return data
    } else {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message || '请求失败'))
    }
  },
  async (error) => {
    const authStore = useAuthStore()
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (error.response?.status === 401) {
      const requestUrl = originalRequest?.url || ''

      if (requestUrl.includes('/auth/refresh') || originalRequest?._retry) {
        authStore.logout()
        return Promise.reject(error)
      }

      if (originalRequest) {
        originalRequest._retry = true
      }

      try {
        await authStore.refreshAccessToken()
        if (originalRequest?.headers && authStore.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
        }
        if (originalRequest) {
          return http.request(originalRequest)
        }
      } catch (_refreshError) {
        authStore.logout()
        return Promise.reject(error)
      }
    } else {
      ElMessage.error(error.response?.data?.message || '网络错误')
    }

    return Promise.reject(error)
  }
)

export default http
