import * as React from 'react'
import { Link } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project.api'
import { taskApi, TaskStatus, type Task } from '@/api/task.api'
import OrbitImages from '@/components/OrbitImages'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableCell, TableHead, TableRow } from '@/components/ui/table'
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

type ProjectInsight = {
  project: Project
  total: number
  done: number
  inProgress: number
  review: number
  todo: number
  overdue: number
  dueSoon: number
  completion: number
}

type RiskLevel = 'low' | 'medium' | 'high'

const STATUS_META: Array<{
  key: TaskStatus
  label: string
  color: string
}> = [
  { key: TaskStatus.TODO, label: '待办', color: '#f59e0b' },
  { key: TaskStatus.IN_PROGRESS, label: '进行中', color: '#0ea5e9' },
  { key: TaskStatus.REVIEW, label: '评审中', color: '#f97316' },
  { key: TaskStatus.DONE, label: '已完成', color: '#10b981' },
]

const GALLERY_BACKGROUNDS = [
  'linear-gradient(135deg, #0f766e, #06b6d4)',
  'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
  'linear-gradient(135deg, #166534, #22c55e)',
  'linear-gradient(135deg, #b45309, #f97316)',
  'linear-gradient(135deg, #334155, #0f766e)',
  'linear-gradient(135deg, #0f172a, #2563eb)',
]

function calcRisk(insight: ProjectInsight): RiskLevel {
  if (insight.overdue > 0 || (insight.dueSoon >= 3 && insight.done < insight.total / 2)) {
    return 'high'
  }
  if (insight.dueSoon > 0 || insight.inProgress >= 3) {
    return 'medium'
  }
  return 'low'
}

function riskBadgeVariant(level: RiskLevel): 'success' | 'warning' | 'danger' {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  return 'success'
}

function riskLabel(level: RiskLevel): string {
  if (level === 'high') return '高'
  if (level === 'medium') return '中'
  return '低'
}

function chartGradient(statusCounts: Record<TaskStatus, number>): string {
  const total = Object.values(statusCounts).reduce((sum, value) => sum + value, 0)
  if (total === 0) {
    return 'conic-gradient(#e2e8f0 0 100%)'
  }

  let current = 0
  const ranges = STATUS_META.map((item) => {
    const count = statusCounts[item.key] || 0
    const ratio = (count / total) * 100
    const start = current
    current += ratio
    return `${item.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`
  })

  return `conic-gradient(${ranges.join(', ')})`
}

function galleryBackground(projectId: string): string {
  let seed = 0
  for (let index = 0; index < projectId.length; index += 1) {
    seed += projectId.charCodeAt(index)
  }
  return GALLERY_BACKGROUNDS[seed % GALLERY_BACKGROUNDS.length]
}

const ORBIT_COLOR_PAIRS = [
  ['#0f766e', '#06b6d4'],
  ['#1d4ed8', '#38bdf8'],
  ['#166534', '#22c55e'],
  ['#b45309', '#f97316'],
  ['#334155', '#0f766e'],
  ['#0f172a', '#2563eb'],
]

function avatarDataUri(label: string, index: number): string {
  const [start, end] = ORBIT_COLOR_PAIRS[index % ORBIT_COLOR_PAIRS.length]
  const text = (label || '?').trim().slice(0, 2).toUpperCase()
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${start}'/><stop offset='100%' stop-color='${end}'/></linearGradient></defs><rect width='96' height='96' rx='48' fill='url(#g)'/><circle cx='48' cy='48' r='43' fill='rgba(255,255,255,0.1)'/><text x='48' y='54' text-anchor='middle' font-size='30' font-family='Arial, sans-serif' font-weight='700' fill='white'>${text}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
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

  const tasksByProjectId = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach((task) => {
      const list = map.get(task.projectId) || []
      list.push(task)
      map.set(task.projectId, list)
    })
    return map
  }, [tasks])

  const projectInsights = React.useMemo<ProjectInsight[]>(() => {
    const now = Date.now()
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000

    return projects.map((project) => {
      const projectTasks = tasksByProjectId.get(project.id) || []
      const total = projectTasks.length
      const done = projectTasks.filter((task) => task.status === TaskStatus.DONE).length
      const inProgress = projectTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length
      const review = projectTasks.filter((task) => task.status === TaskStatus.REVIEW).length
      const todo = projectTasks.filter((task) => task.status === TaskStatus.TODO).length

      let overdue = 0
      let dueSoon = 0
      projectTasks.forEach((task) => {
        if (!task.dueDate || task.status === TaskStatus.DONE) return
        const due = new Date(task.dueDate).getTime()
        if (Number.isNaN(due)) return
        if (due < now) overdue += 1
        else if (due <= now + threeDaysMs) dueSoon += 1
      })

      return {
        project,
        total,
        done,
        inProgress,
        review,
        todo,
        overdue,
        dueSoon,
        completion: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    })
  }, [projects, tasksByProjectId])

  const topInsights = React.useMemo(
    () =>
      [...projectInsights]
        .sort((a, b) => {
          const timeDiff = +new Date(b.project.updatedAt) - +new Date(a.project.updatedAt)
          if (timeDiff !== 0) return timeDiff
          return b.total - a.total
        })
        .slice(0, 8),
    [projectInsights],
  )

  const statusCounts = React.useMemo(() => {
    return {
      [TaskStatus.TODO]: tasks.filter((task) => task.status === TaskStatus.TODO).length,
      [TaskStatus.IN_PROGRESS]: tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length,
      [TaskStatus.REVIEW]: tasks.filter((task) => task.status === TaskStatus.REVIEW).length,
      [TaskStatus.DONE]: tasks.filter((task) => task.status === TaskStatus.DONE).length,
    }
  }, [tasks])

  const totalTaskCount = tasks.length
  const donutBackground = React.useMemo(() => chartGradient(statusCounts), [statusCounts])

  const orbitImageSources = React.useMemo(() => {
    const labels = new Set<string>()
    projects.forEach((project) => {
      labels.add(project.name)
      const members = Array.isArray(project.members) ? project.members : []
      members.forEach((member) => labels.add(member.name || member.email))
    })

    const fallback = ['产品', '设计', '前端', '后端', '测试', '运维', '数据', '商务']
    const merged = [...labels, ...fallback]
    return merged.slice(0, 12).map((label, index) => avatarDataUri(label, index))
  }, [projects])

  return (
    <div className="page-stack">
      <section className="dashboard-orbit-hero">
        <div>
          <p className="dashboard-orbit-eyebrow">项目协同轨道</p>
          <h2>团队协作与项目可视化流转屏</h2>
          <p className="muted">围绕项目、成员、任务形成执行轨道，实时观察交付动能。</p>
        </div>
        <div className="dashboard-orbit-canvas">
          <OrbitImages
            images={orbitImageSources}
            responsive
            baseWidth={560}
            radiusX={205}
            radiusY={98}
            itemSize={52}
            duration={24}
            rotation={-6}
            showPath
            pathColor="rgba(15, 118, 110, 0.22)"
            pathWidth={2}
            centerContent={
              <div className="dashboard-orbit-center">
                <p>活跃项目</p>
                <strong>{projects.length}</strong>
                <span>任务 {totalTaskCount}</span>
              </div>
            }
          />
        </div>
      </section>

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

          <section className="dashboard-visual-grid">
            <Card>
              <CardHeader>
                <CardTitle>任务状态可视化</CardTitle>
                <CardDescription>按任务状态聚合，快速评估当前执行节奏</CardDescription>
              </CardHeader>
              <CardContent>
                {totalTaskCount === 0 ? (
                  <p className="muted">暂无任务数据，创建任务后这里会自动生成可视化图表。</p>
                ) : (
                  <div className="dashboard-status-wrap">
                    <div className="status-donut" style={{ backgroundImage: donutBackground }}>
                      <div className="status-donut-center">
                        <p>任务总量</p>
                        <strong>{totalTaskCount}</strong>
                      </div>
                    </div>
                    <div className="status-legend-stack">
                      {STATUS_META.map((item) => {
                        const count = statusCounts[item.key] || 0
                        const ratio = totalTaskCount > 0 ? Math.round((count / totalTaskCount) * 100) : 0
                        return (
                          <div key={item.key} className="status-legend-item">
                            <div className="status-legend-row">
                              <span className="status-dot" style={{ backgroundColor: item.color }} />
                              <span>{item.label}</span>
                              <strong>{count}</strong>
                            </div>
                            <div className="status-bar-track">
                              <span className="status-bar-fill" style={{ width: `${ratio}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>项目执行表格</CardTitle>
                <CardDescription>展示进度、风险与交付压力，支持快速定位重点项目</CardDescription>
              </CardHeader>
              <CardContent>
                {topInsights.length === 0 ? (
                  <p className="muted">暂无项目数据。</p>
                ) : (
                  <div className="dashboard-table-wrap">
                    <Table>
                      <thead>
                        <TableRow>
                          <TableHead>项目</TableHead>
                          <TableHead>进度</TableHead>
                          <TableHead>任务</TableHead>
                          <TableHead>风险</TableHead>
                          <TableHead>更新</TableHead>
                        </TableRow>
                      </thead>
                      <tbody>
                        {topInsights.map((insight) => {
                          const risk = calcRisk(insight)
                          return (
                            <TableRow key={insight.project.id}>
                              <TableCell>
                                <div className="dashboard-table-title">
                                  <Link className="inline-link" to={`/projects/${insight.project.id}`}>
                                    {insight.project.name}
                                  </Link>
                                  <Badge variant="secondary">{statusLabel(insight.project.status)}</Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="dashboard-progress-inline">
                                  <span>{insight.completion}%</span>
                                  <div className="dashboard-progress-track">
                                    <span className="dashboard-progress-fill" style={{ width: `${insight.completion}%` }} />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {insight.done}/{insight.total} 完成
                              </TableCell>
                              <TableCell>
                                <Badge variant={riskBadgeVariant(risk)}>{riskLabel(risk)}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(insight.project.updatedAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>项目图库</CardTitle>
                <CardDescription>按视觉卡片浏览项目，快速把握状态与交付时间</CardDescription>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <p className="muted">暂无项目。</p>
                ) : (
                  <div className="project-gallery-grid">
                    {recentProjects.map((project) => {
                      const insight = projectInsights.find((item) => item.project.id === project.id)
                      return (
                        <Link className="project-gallery-card" key={project.id} to={`/projects/${project.id}`}>
                          <div className="project-gallery-cover" style={{ backgroundImage: galleryBackground(project.id) }}>
                            <Badge variant="outline">{statusLabel(project.status)}</Badge>
                          </div>
                          <div className="project-gallery-body">
                            <p className="project-gallery-title">{project.name}</p>
                            <p className="muted">更新于 {formatDate(project.updatedAt)}</p>
                            <div className="project-gallery-meta">
                              <span>任务 {insight?.total ?? 0}</span>
                              <span>完成 {insight?.completion ?? 0}%</span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
