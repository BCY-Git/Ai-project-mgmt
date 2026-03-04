import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type UserInfo } from '@/api/auth.api'
import { ElMessage } from 'element-plus'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<UserInfo | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isManager = computed(() => ['admin', 'manager'].includes(user.value?.role || ''))
  const isMember = computed(() => user.value?.role === 'member')

  // Actions
  async function login(email: string, password: string) {
    try {
      const { user: userData, accessToken: token, refreshToken: refresh } = await authApi.login({
        email,
        password,
      })

      user.value = userData
      accessToken.value = token
      refreshToken.value = refresh

      // 存储到localStorage
      localStorage.setItem('accessToken', token)
      localStorage.setItem('refreshToken', refresh)

      ElMessage.success('登录成功')
      return true
    } catch (error) {
      ElMessage.error('登录失败')
      return false
    }
  }

  async function register(name: string, email: string, password: string, role = 'member') {
    try {
      const { user: userData, accessToken: token, refreshToken: refresh } = await authApi.register({
        name,
        email,
        password,
        role: role as any,
      })

      user.value = userData
      accessToken.value = token
      refreshToken.value = refresh

      localStorage.setItem('accessToken', token)
      localStorage.setItem('refreshToken', refresh)

      ElMessage.success('注册成功')
      return true
    } catch (error) {
      ElMessage.error('注册失败')
      return false
    }
  }

  async function fetchCurrentUser() {
    try {
      const userData = await authApi.getCurrentUser()
      user.value = userData
      return true
    } catch (error) {
      logout()
      return false
    }
  }

  async function refreshAccessToken() {
    if (!refreshToken.value) {
      throw new Error('No refresh token')
    }

    const { accessToken: token, refreshToken: refresh } = await authApi.refreshToken(refreshToken.value)

    accessToken.value = token
    refreshToken.value = refresh

    localStorage.setItem('accessToken', token)
    localStorage.setItem('refreshToken', refresh)
  }

  function logout() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    ElMessage.success('已退出登录')
    router.push('/login')
  }

  async function updateProfile(_params: Partial<UserInfo>) {
    try {
      // 这里需要调用更新用户信息的API
      // const updatedUser = await userApi.updateProfile(params)
      // user.value = updatedUser
      ElMessage.success('更新成功')
      return true
    } catch (error) {
      ElMessage.error('更新失败')
      return false
    }
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,

    // Getters
    isAuthenticated,
    isAdmin,
    isManager,
    isMember,

    // Actions
    login,
    register,
    fetchCurrentUser,
    refreshAccessToken,
    logout,
    updateProfile,
  }
})
