import * as React from 'react'
import { Link } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project.api'
import { taskApi, TaskStatus, type Task } from '@/api/task.api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate, statusLabel } from '@/lib/format'

function StatCard({ title, value, tone }: { title: string; value: number; tone: 'blue' | 'green' | 'orange' | 'rose' }): React.JSX.Element {
  return (
    <Card className={`stat-card stat-card-${tone}`}>
      <CardContent>
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardPage(): React.JSX.Element {
  const { push } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])

  React.useEffect(() => {
    let active = true

    async function load() {
      try {
        const [projectRes, taskRes] = await Promise.all([projectApi.list({ limit: 100 }), taskApi.list({ limit: 100 })])
        if (!active) return
        setProjects(projectRes.items)
        setTasks(taskRes.items)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : '仪表盘加载失败'
        push(message, 'error')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [push])

  const todoCount = tasks.filter((task) => task.status === TaskStatus.TODO).length
  const inProgressCount = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length
  const doneCount = tasks.filter((task) => task.status === TaskStatus.DONE).length

  const recentProjects = [...projects]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 6)

  return (
    <div className="page-stack">
      <div className="page-headline">
        <h1>执行全景</h1>
        <p>把拆解、排期、执行和交付放在一个视图里，快速定位阻塞点。</p>
      </div>

      {loading ? (
        <div className="page-loading-card">
          <Spinner />
        </div>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard title="项目总数" value={projects.length} tone="blue" />
            <StatCard title="待办任务" value={todoCount} tone="orange" />
            <StatCard title="进行中" value={inProgressCount} tone="rose" />
            <StatCard title="已完成" value={doneCount} tone="green" />
          </section>

          <section className="dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>近期项目</CardTitle>
                <CardDescription>最近有更新的项目优先展示</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="list-stack">
                  {recentProjects.length === 0 ? (
                    <p className="muted">暂无项目，先创建一个开始。</p>
                  ) : (
                    recentProjects.map((project) => (
                      <div key={project.id} className="list-item-row">
                        <div>
                          <p className="list-item-title">{project.name}</p>
                          <p className="muted">更新于 {formatDate(project.updatedAt)}</p>
                        </div>
                        <div className="row-actions">
                          <Badge variant="secondary">{statusLabel(project.status)}</Badge>
                          <Link className="inline-link" to={`/projects/${project.id}`}>查看</Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>快捷入口</CardTitle>
                <CardDescription>常用功能的快速跳转</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="shortcut-grid">
                  <Link className="shortcut-card" to="/projects">
                    <h4>项目中心</h4>
                    <p>新建项目、更新进展、查看里程碑</p>
                  </Link>
                  <Link className="shortcut-card" to="/my-tasks">
                    <h4>我的任务</h4>
                    <p>按优先级处理个人待办与评审项</p>
                  </Link>
                  <Link className="shortcut-card" to="/projects">
                    <h4>AI 拆解</h4>
                    <p>进入项目后发起需求拆解与任务草稿</p>
                  </Link>
                  <Link className="shortcut-card" to="/team">
                    <h4>团队看板</h4>
                    <p>查看成员负载，平衡工作分配</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
