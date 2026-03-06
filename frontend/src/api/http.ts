import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean }

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const authHttp = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

function clearTokens(): void {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

function notifyAuthExpired(): void {
  window.dispatchEvent(new CustomEvent('auth:expired'))
}

let refreshTokenPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshTokenPromise) {
    return refreshTokenPromise
  }

  refreshTokenPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const response = await authHttp.post<
        ApiEnvelope<{ accessToken: string; refreshToken: string }>
      >('/auth/refresh', { refreshToken })

      const payload = response.data
      if (payload?.code !== 0 || !payload?.data?.accessToken || !payload?.data?.refreshToken) {
        return null
      }

      setTokens(payload.data.accessToken, payload.data.refreshToken)
      return payload.data.accessToken
    } catch {
      return null
    } finally {
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type']
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  ((response: AxiosResponse<ApiEnvelope<unknown>>) => {
    const payload = response.data
    if (payload && payload.code === 0) {
      return payload.data
    }

    const message = payload?.message || '请求失败'
    return Promise.reject(new Error(message))
  }) as any,
  async (error: AxiosError<{ message?: string }>) => {
    const originalRequest = error.config as RetriableRequest | undefined
    const status = error.response?.status
    const requestUrl = originalRequest?.url || ''

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/refresh')
    ) {
      originalRequest._retry = true
      const nextToken = await refreshAccessToken()

      if (nextToken) {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${nextToken}`
        return http.request(originalRequest)
      }

      clearTokens()
      notifyAuthExpired()
    }

    const message =
      (error.response?.data && 'message' in error.response.data && error.response.data.message) ||
      error.message ||
      '网络错误'

    return Promise.reject(new Error(message))
  },
)

export default http
