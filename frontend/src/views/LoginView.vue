<template>
  <div class="login-container">
    <div class="login-box">
      <!-- Logo -->
      <div class="logo">
        <img src="@/assets/logo.png" alt="logo" />
        <h1>AI项目管理系统</h1>
      </div>

      <!-- 登录表单 -->
      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
        size="large"
      >
        <el-form-item prop="email">
          <el-input
            v-model="loginForm.email"
            placeholder="请输入邮箱"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>

        <el-form-item>
          <div class="switch-mode">
            <el-button type="text" @click="isLogin = !isLogin">
              {{ isLogin ? '没有账号？立即注册' : '已有账号？立即登录' }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { User, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const isLogin = ref(true)

const loginForm = ref({
  email: '',
  password: '',
  name: '',
})

const rules = computed<FormRules>(() => {
  const baseRules = {
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
    ],
  }

  if (!isLogin.value) {
    return {
      ...baseRules,
      name: [
        { required: true, message: '请输入姓名', trigger: 'blur' },
        { min: 2, message: '姓名长度不能少于2位', trigger: 'blur' },
      ],
    }
  }

  return baseRules
})

const handleLogin = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate()
  if (!valid) return

  loading.value = true

  try {
    if (isLogin.value) {
      const ok = await authStore.login(loginForm.value.email, loginForm.value.password)
      if (!ok) return
    } else {
      // 注册模式暂时未实现
      ElMessage.info('注册功能开发中')
      isLogin.value = true
      return
    }

    // 跳转到目标页面或首页
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo img {
  height: 64px;
  margin-bottom: 10px;
}

.logo h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  color: #303133;
}

.login-form {
  margin-top: 30px;
}

.login-btn {
  width: 100%;
}

.switch-mode {
  text-align: center;
}
</style>
