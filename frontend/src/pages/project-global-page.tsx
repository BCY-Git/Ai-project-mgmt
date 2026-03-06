import * as React from 'react'
import { Link } from 'react-router-dom'
import { projectApi, ProjectStatus, type Project } from '@/api/project.api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { formatDate, statusLabel } from '@/lib/format'

const columns: ProjectStatus[] = [
  ProjectStatus.ACTIVE,
  ProjectStatus.REVIEWING,
  ProjectStatus.DECOMPOSING,
  ProjectStatus.DRAFT,
  ProjectStatus.COMPLETED,
  ProjectStatus.ARCHIVED,
]

function badgeVariant(status: ProjectStatus): 'secondary' | 'warning' | 'success' {
  if (status === ProjectStatus.ACTIVE || status === ProjectStatus.COMPLETED) return 'success'
  if (status === ProjectStatus.REVIEWING || status === ProjectStatus.DECOMPOSING) return 'warning'
  return 'secondary'
}

export function ProjectGlobalPage(): React.JSX.Element {
  const { push } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [keyword, setKeyword] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')

  const fetchProjects = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await projectApi.list({ limit: 200 })
      setProjects(result.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : '项目加载失败'
      push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [push])

  React.useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filtered = React.useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return projects.filter((project) => {
      const matchText =
        !text ||
        project.name.toLowerCase().includes(text) ||
        (project.description || '').toLowerCase().includes(text)
      const matchStatus = !statusFilter || project.status === statusFilter
      return matchText && matchStatus
    })
  }, [keyword, projects, statusFilter])

  const grouped = React.useMemo(() => {
    return columns.reduce<Record<ProjectStatus, Project[]>>((acc, status) => {
      acc[status] = filtered.filter((project) => project.status === status)
      return acc
    }, {
      [ProjectStatus.ACTIVE]: [],
      [ProjectStatus.REVIEWING]: [],
      [ProjectStatus.DECOMPOSING]: [],
      [ProjectStatus.DRAFT]: [],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.ARCHIVED]: [],
    })
  }, [filtered])

  return (
    <div className="page-stack">
      <Card>
        <CardHeader className="row-between">
          <div>
            <CardTitle>项目全局</CardTitle>
            <CardDescription>跨项目查看状态分布，快速进入项目详情</CardDescription>
          </div>
          <div className="toolbar-inline">
            <Input
              className="toolbar-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索项目"
            />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              {columns.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <p className="muted">项目加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="kanban-grid">
          {columns.map((column) => (
            <Card key={column} className="kanban-column">
              <CardHeader>
                <div className="row-between">
                  <CardTitle>{statusLabel(column)}</CardTitle>
                  <Badge variant="secondary">{grouped[column].length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="list-stack">
                  {grouped[column].map((project) => (
                    <div key={project.id} className="task-board-card project-card">
                      <div className="row-between">
                        <p className="list-item-title">{project.name}</p>
                        <Badge variant={badgeVariant(project.status)}>{statusLabel(project.status)}</Badge>
                      </div>
                      <p className="muted line-clamp-2">{project.description || '暂无描述'}</p>
                      <p className="muted">截止: {formatDate(project.deadline)}</p>
                      <div className="row-actions">
                        <Link className="inline-link" to={`/projects/${project.id}`}>
                          详情
                        </Link>
                        <Link className="inline-link" to={`/projects/${project.id}/board`}>
                          看板
                        </Link>
                      </div>
                    </div>
                  ))}
                  {grouped[column].length === 0 && <p className="muted">暂无项目</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
