import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      public: true,
      layout: 'blank',
    },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: {
          title: '仪表盘',
        },
      },
      {
        path: 'projects',
        name: 'ProjectList',
        component: () => import('@/views/ProjectListView.vue'),
        meta: {
          title: '项目列表',
        },
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/ProjectDetailView.vue'),
        meta: {
          title: '项目详情',
        },
        props: true,
      },
      {
        path: 'projects/:id/decompose',
        name: 'AiDecompose',
        component: () => import('@/views/AiDecomposeView.vue'),
        meta: {
          title: 'AI智能拆解',
          roles: ['admin', 'manager'],
        },
        props: true,
      },
      {
        path: 'projects/:id/board',
        name: 'TaskBoard',
        component: () => import('@/views/TaskBoardView.vue'),
        meta: {
          title: '任务看板',
        },
        props: true,
      },
      {
        path: 'my-tasks',
        name: 'MyTasks',
        component: () => import('@/views/MyTasksView.vue'),
        meta: {
          title: '我的任务',
        },
      },
      {
        path: 'team',
        name: 'Team',
        component: () => import('@/views/TeamView.vue'),
        meta: {
          title: '团队管理',
          roles: ['admin', 'manager'],
        },
      },
    ],
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: {
      public: true,
      layout: 'blank',
      title: '无权限',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      layout: 'blank',
      title: '页面不存在',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 全局前置守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - AI项目管理系统` : 'AI项目管理系统'

  // 公开页面直接放行
  if (to.meta.public) {
    // 已登录用户访问登录页，跳转到首页
    if (to.path === '/login' && authStore.isAuthenticated) {
      return next('/')
    }
    return next()
  }

  // 检查是否需要登录
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 尝试从localStorage恢复登录状态
    const token = localStorage.getItem('accessToken')
    if (token) {
      await authStore.fetchCurrentUser()
      if (authStore.isAuthenticated) {
        return next()
      }
    }
    return next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  // 已有 token 但用户信息未加载时，补拉取当前用户
  if (to.meta.requiresAuth && authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchCurrentUser()
    if (!authStore.isAuthenticated) {
      return next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  }

  // 检查角色权限
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(authStore.user?.role || '')) {
    return next('/403')
  }

  next()
})

export default router
