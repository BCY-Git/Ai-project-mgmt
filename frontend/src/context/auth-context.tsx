import * as React from 'react'
import { authApi, type UserInfo } from '@/api/auth.api'

type AuthContextValue = {
  user: UserInfo | null
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshCurrentUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = React.useState<UserInfo | null>(null)
  const [accessToken, setAccessToken] = React.useState<string | null>(getStoredAccessToken())
  const [loading, setLoading] = React.useState(true)

  const logout = React.useCallback(() => {
    clearStoredTokens()
    setAccessToken(null)
    setUser(null)
  }, [])

  const refreshCurrentUser = React.useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) {
      setUser(null)
      return
    }

    const profile = await authApi.getCurrentUser()
    setUser(profile)
    setAccessToken(token)
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    saveTokens(result.accessToken, result.refreshToken)
    setAccessToken(result.accessToken)
    setUser(result.user)
  }, [])

  const register = React.useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.register({ name, email, password })
    saveTokens(result.accessToken, result.refreshToken)
    setAccessToken(result.accessToken)
    setUser(result.user)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        if (getStoredAccessToken()) {
          const profile = await authApi.getCurrentUser()
          if (!cancelled) {
            setUser(profile)
          }
        }
      } catch {
        if (!cancelled) {
          logout()
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    const onExpired = () => {
      logout()
    }

    window.addEventListener('auth:expired', onExpired)

    return () => {
      cancelled = true
      window.removeEventListener('auth:expired', onExpired)
    }
  }, [logout])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      loading,
      login,
      register,
      logout,
      refreshCurrentUser,
    }),
    [accessToken, loading, login, logout, refreshCurrentUser, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
