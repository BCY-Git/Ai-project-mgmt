import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { projectApi, type Project } from '@/api/project.api'
import { taskApi, TaskPriority, TaskStatus, type Task } from '@/api/task.api'
import { userApi, type TeamUser } from '@/api/user.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatDate, initials, statusLabel } from '@/lib/format'

function priorityVariant(priority?: TaskPriority | null): 'secondary' | 'warning' | 'danger' {
  if (priority === TaskPriority.HIGH || priority === TaskPriority.URGENT) return 'danger'
  if (priority === TaskPriority.MEDIUM) return 'warning'
  return 'secondary'
}

function statusVariant(status?: TaskStatus): 'secondary' | 'warning' | 'success' {
  if (status === TaskStatus.DONE) return 'success'
  if (status === TaskStatus.IN_PROGRESS || status === TaskStatus.REVIEW) return 'warning'
  return 'secondary'
}

export function ProjectDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>()
  const projectId = params.id || ''
  const { push } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [assignees, setAssignees] = React.useState<TeamUser[]>([])
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: TaskPriority.MEDIUM,
    estimatedHours: '8',
  })

  const load = React.useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const [projectRes, taskRes] = await Promise.all([
        projectApi.get(projectId),
        taskApi.list({ projectId, limit: 100 }),
      ])
      setProject(projectRes)
      setTasks(taskRes.items)

      try {
        const users = await userApi.list()
        setAssignees(users)
      } catch {
        setAssignees(
          (projectRes.members || []).map((member) => ({
            ...member,
            role: 'member',
            skills: [],
            currentWorkload: 0,
            isActive: true,
            createdAt: projectRes.createdAt,
            updatedAt: projectRes.updatedAt,
          })),
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '项目详情加载失败'
      push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, push])

  React.useEffect(() => {
    load()
  }, [load])

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!projectId || !form.title.trim()) {
      push('请填写任务标题', 'error')
      return
    }

    setSubmitting(true)
    try {
      await taskApi.create({
        projectId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assigneeId: form.assigneeId || undefined,
        priority: form.priority,
        status: TaskStatus.TODO,
        estimatedHours: Number(form.estimatedHours) || 8,
      })
      push('任务创建成功', 'success')
      setForm({ title: '', description: '', assigneeId: '', priority: TaskPriority.MEDIUM, estimatedHours: '8' })
      await load()
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建任务失败'
      push(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="row-between">
        <div>
          <h1>{project?.name || '项目详情'}</h1>
          <p className="muted">{project?.description || '暂无描述'}</p>
        </div>
        <div className="toolbar-inline">
          <Link className="button-link button-link-outline" to={`/projects/${projectId}/board`}>
            任务看板
          </Link>
          <Link className="button-link" to={`/projects/${projectId}/decompose`}>
            AI 拆解
          </Link>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <p className="muted">加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>项目信息</CardTitle>
                <CardDescription>基础信息与成员概览</CardDescription>
              </CardHeader>
              <CardContent className="list-stack">
                <div className="row-between">
                  <span className="muted">状态</span>
                  <Badge variant="secondary">{statusLabel(project?.status)}</Badge>
                </div>
                <div className="row-between">
                  <span className="muted">创建时间</span>
                  <span>{formatDate(project?.createdAt)}</span>
                </div>
                <div className="row-between">
                  <span className="muted">截止日期</span>
                  <span>{formatDate(project?.deadline)}</span>
                </div>
                <div>
                  <p className="muted">成员</p>
                  <div className="avatar-row">
                    {(project?.members || []).map((member) => (
                      <div key={member.id} className="avatar-item" title={member.name || member.email}>
                        <span className="avatar-chip">{initials(member.name || member.email, 'U')}</span>
                        <span>{member.name || member.email}</span>
                      </div>
                    ))}
                    {project?.members?.length === 0 && <p className="muted">暂无成员</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>快速创建任务</CardTitle>
                <CardDescription>直接录入任务并回到任务列表跟进</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="inline-form" onSubmit={createTask}>
                  <label className="field-block">
                    <span>任务标题</span>
                    <Input
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="例如：实现登录接口"
                    />
                  </label>
                  <label className="field-block">
                    <span>任务描述</span>
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </label>
                  <div className="form-grid-3">
                    <label className="field-block">
                      <span>负责人</span>
                      <Select
                        value={form.assigneeId}
                        onChange={(event) => setForm((prev) => ({ ...prev, assigneeId: event.target.value }))}
                      >
                        <option value="">未指定</option>
                        {assignees.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name || person.email}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="field-block">
                      <span>优先级</span>
                      <Select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
                        }
                      >
                        <option value={TaskPriority.LOW}>低</option>
                        <option value={TaskPriority.MEDIUM}>中</option>
                        <option value={TaskPriority.HIGH}>高</option>
                        <option value={TaskPriority.URGENT}>紧急</option>
                      </Select>
                    </label>
                    <label className="field-block">
                      <span>预估工时</span>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={form.estimatedHours}
                        onChange={(event) => setForm((prev) => ({ ...prev, estimatedHours: event.target.value }))}
                      />
                    </label>
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? '提交中...' : '创建任务'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>任务列表</CardTitle>
              <CardDescription>共 {tasks.length} 条任务</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="ui-table-head">标题</th>
                      <th className="ui-table-head">状态</th>
                      <th className="ui-table-head">优先级</th>
                      <th className="ui-table-head">负责人</th>
                      <th className="ui-table-head">更新时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="ui-table-row">
                        <td className="ui-table-cell">{task.title}</td>
                        <td className="ui-table-cell">
                          <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
                        </td>
                        <td className="ui-table-cell">
                          <Badge variant={priorityVariant(task.priority)}>{statusLabel(task.priority)}</Badge>
                        </td>
                        <td className="ui-table-cell">{task.assignee?.name || task.assignee?.email || '-'}</td>
                        <td className="ui-table-cell">{formatDate(task.updatedAt)}</td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr>
                        <td className="ui-table-cell" colSpan={5}>
                          <p className="muted">暂无任务</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
