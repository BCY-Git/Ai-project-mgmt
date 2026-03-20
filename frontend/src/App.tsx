import * as React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthProvider } from '@/context/auth-context'
import { Spinner } from '@/components/ui/spinner'
import { ToastProvider } from '@/components/ui/toast'

const LoginPage = React.lazy(async () => ({ default: (await import('@/pages/login-page')).LoginPage }))
const DashboardPage = React.lazy(async () => ({ default: (await import('@/pages/dashboard-page')).DashboardPage }))
const ProjectListPage = React.lazy(async () => ({ default: (await import('@/pages/project-list-page')).ProjectListPage }))
const ProjectGlobalPage = React.lazy(async () => ({ default: (await import('@/pages/project-global-page')).ProjectGlobalPage }))
const ProjectDetailPage = React.lazy(async () => ({ default: (await import('@/pages/project-detail-page')).ProjectDetailPage }))
const ChatPage = React.lazy(async () => ({ default: (await import('@/pages/chat-page')).ChatPage }))
const TaskBoardPage = React.lazy(async () => ({ default: (await import('@/pages/task-board-page')).TaskBoardPage }))
const MyTasksPage = React.lazy(async () => ({ default: (await import('@/pages/my-tasks-page')).MyTasksPage }))
const TeamPage = React.lazy(async () => ({ default: (await import('@/pages/team-page')).TeamPage }))
const AiDecomposePage = React.lazy(async () => ({ default: (await import('@/pages/ai-decompose-page')).AiDecomposePage }))
const ForbiddenPage = React.lazy(async () => ({ default: (await import('@/pages/forbidden-page')).ForbiddenPage }))
const NotFoundPage = React.lazy(async () => ({ default: (await import('@/pages/not-found-page')).NotFoundPage }))

function ShellRoutes(): React.JSX.Element {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  )
}

function ManagerRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <ProtectedRoute roles={['admin', 'manager']}>{children}</ProtectedRoute>
}

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <React.Suspense
            fallback={
              <div className="page-loading-card">
                <Spinner />
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage fullScreen />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<ShellRoutes />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects" element={<ProjectListPage />} />
                <Route path="projects-global" element={<ProjectGlobalPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route
                  path="projects/:id/decompose"
                  element={
                    <ManagerRoute>
                      <AiDecomposePage />
                    </ManagerRoute>
                  }
                />
                <Route path="projects/:id/board" element={<TaskBoardPage />} />
                <Route path="my-tasks" element={<MyTasksPage />} />
                <Route
                  path="team"
                  element={
                    <ManagerRoute>
                      <TeamPage />
                    </ManagerRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
