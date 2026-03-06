import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthProvider } from '@/context/auth-context'
import { ToastProvider } from '@/components/ui/toast'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { ProjectListPage } from '@/pages/project-list-page'
import { ProjectGlobalPage } from '@/pages/project-global-page'
import { ProjectDetailPage } from '@/pages/project-detail-page'
import { ChatPage } from '@/pages/chat-page'
import { TaskBoardPage } from '@/pages/task-board-page'
import { MyTasksPage } from '@/pages/my-tasks-page'
import { TeamPage } from '@/pages/team-page'
import { AiDecomposePage } from '@/pages/ai-decompose-page'
import { ForbiddenPage } from '@/pages/forbidden-page'
import { NotFoundPage } from '@/pages/not-found-page'

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
        <BrowserRouter>
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
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
