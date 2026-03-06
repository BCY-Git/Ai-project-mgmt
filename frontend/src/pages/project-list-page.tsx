import * as React from 'react'
import { Link } from 'react-router-dom'
import { projectApi, ProjectStatus, type Project } from '@/api/project.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate, statusLabel } from '@/lib/format'

function badgeVariant(status: ProjectStatus): 'secondary' | 'warning' | 'success' {
  if (status === ProjectStatus.ACTIVE) return 'success'
  if (status === ProjectStatus.DECOMPOSING || status === ProjectStatus.REVIEWING) return 'warning'
  return 'secondary'
}

export function ProjectListPage(): React.JSX.Element {
  const { push } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [creating, setCreating] = React.useState(false)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [keyword, setKeyword] = React.useState('')
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', deadline: '' })

  const fetchProjects = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await projectApi.list({ limit: 100 })
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
    if (!text) return projects
    return projects.filter((project) => {
      const name = project.name.toLowerCase()
      const description = (project.description || '').toLowerCase()
      return name.includes(text) || description.includes(text)
    })
  }, [keyword, projects])

  const metrics = React.useMemo(() => {
    const total = projects.length
    const active = projects.filter((project) => project.status === ProjectStatus.ACTIVE).length
    const draft = projects.filter((project) => project.status === ProjectStatus.DRAFT).length
    const completed = projects.filter((project) => project.status === ProjectStatus.COMPLETED).length
    return { total, active, draft, completed }
  }, [projects])

  const latestUpdatedAt = React.useMemo(() => {
    if (projects.length === 0) return ''
    const latest = [...projects].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0]
    return formatDate(latest.updatedAt)
  }, [projects])

  const hasKeyword = keyword.trim().length > 0

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.description.trim()) {
      push('请填写项目名称和描述', 'error')
      return
    }

    setCreating(true)
    try {
      const created = await projectApi.create({
        name: form.name.trim(),
        description: form.description.trim(),
        deadline: form.deadline ? new Date(`${form.deadline}T00:00:00`).toISOString() : undefined,
      })
      setProjects((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
      setKeyword('')
      push('项目创建成功', 'success')
      setForm({ name: '', description: '', deadline: '' })
      setShowCreateModal(false)
      void fetchProjects()
    } catch (error) {
      const message = error instanceof Error ? error.message : '项目创建失败'
      push(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-stack">
      <Card className="project-center-card">
        <CardHeader className="project-center-header">
          <div className="project-center-copy">
            <CardTitle>项目中心</CardTitle>
            <CardDescription>聚焦项目节奏、拆解进展和执行状态，快速进入下一步动作</CardDescription>
            <div className="project-center-insight">
              <span>{hasKeyword ? `已筛选 ${filtered.length} / ${projects.length}` : `当前项目 ${projects.length} 个`}</span>
              <span>{latestUpdatedAt ? `最近更新 ${latestUpdatedAt}` : '暂无项目更新'}</span>
            </div>
            <div className="project-center-metrics">
              <div className="project-metric">
                <span>项目总数</span>
                <strong>{metrics.total}</strong>
              </div>
              <div className="project-metric">
                <span>进行中</span>
                <strong>{metrics.active}</strong>
              </div>
              <div className="project-metric">
                <span>草稿</span>
                <strong>{metrics.draft}</strong>
              </div>
              <div className="project-metric">
                <span>已完成</span>
                <strong>{metrics.completed}</strong>
              </div>
            </div>
          </div>
          <div className="project-center-actions">
            <p className="project-center-action-title">快速操作</p>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按项目名/描述搜索"
              className="project-center-search"
            />
            <Button className="project-center-create" onClick={() => setShowCreateModal(true)}>
              新建项目
            </Button>
            <p className="project-center-action-tip">支持项目名或描述关键词过滤</p>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <p className="muted">正在加载项目...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="project-grid">
          {filtered.map((project) => (
            <Card key={project.id} className="project-card">
              <CardHeader>
                <div className="row-between">
                  <CardTitle>{project.name}</CardTitle>
                  <Badge variant={badgeVariant(project.status)}>{statusLabel(project.status)}</Badge>
                </div>
                <CardDescription>{project.description || '暂无描述'}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="muted">创建于 {formatDate(project.createdAt)}</p>
                <p className="muted">截止: {formatDate(project.deadline)}</p>
              </CardContent>
              <div className="card-action-strip">
                <Link to={`/projects/${project.id}`}>详情</Link>
                <Link to={`/projects/${project.id}/board`}>看板</Link>
                <Link to={`/projects/${project.id}/decompose`}>AI 拆解</Link>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="muted">暂无匹配项目</p>}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <Card className="modal-card" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="row-between">
              <CardTitle>新建项目</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                关闭
              </Button>
            </CardHeader>
            <CardContent>
              <form className="inline-form" onSubmit={handleCreate}>
                <label className="field-block">
                  <span>项目名称</span>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="例如：营销自动化平台"
                    autoFocus
                  />
                </label>
                <label className="field-block">
                  <span>项目描述</span>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                    placeholder="描述项目目标、范围、验收标准"
                  />
                </label>
                <label className="field-block">
                  <span>截止日期</span>
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
                  />
                </label>
                <div className="form-actions">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? '创建中...' : '创建项目'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
