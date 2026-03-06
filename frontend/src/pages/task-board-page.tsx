import * as React from 'react'
import { useParams } from 'react-router-dom'
import { projectApi } from '@/api/project.api'
import { taskApi, TaskPriority, TaskStatus, type Task } from '@/api/task.api'
import { userApi } from '@/api/user.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { formatDate, statusLabel } from '@/lib/format'

type AssigneeOption = {
  id: string
  name: string
  email: string
}

function toAssigneeOptions(users: Array<{ id: string; name?: string | null; email: string }>): AssigneeOption[] {
  const map = new Map<string, AssigneeOption>()
  users.forEach((user) => {
    map.set(user.id, {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
    })
  })
  return Array.from(map.values())
}

function mergeTaskAssignees(assignees: AssigneeOption[], tasks: Task[]): AssigneeOption[] {
  const map = new Map(assignees.map((person) => [person.id, person]))
  tasks.forEach((task) => {
    if (!task.assignee?.id) return
    map.set(task.assignee.id, {
      id: task.assignee.id,
      name: task.assignee.name || task.assignee.email,
      email: task.assignee.email,
    })
  })
  return Array.from(map.values())
}

const columns: Array<{ key: TaskStatus; title: string }> = [
  { key: TaskStatus.TODO, title: '待办' },
  { key: TaskStatus.IN_PROGRESS, title: '进行中' },
  { key: TaskStatus.REVIEW, title: '评审中' },
  { key: TaskStatus.DONE, title: '已完成' },
]

const nextStatusMap: Record<TaskStatus, TaskStatus> = {
  [TaskStatus.TODO]: TaskStatus.IN_PROGRESS,
  [TaskStatus.IN_PROGRESS]: TaskStatus.REVIEW,
  [TaskStatus.REVIEW]: TaskStatus.DONE,
  [TaskStatus.DONE]: TaskStatus.DONE,
}

export function TaskBoardPage(): React.JSX.Element {
  const params = useParams<{ id: string }>()
  const projectId = params.id || ''
  const { push } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [movingId, setMovingId] = React.useState('')
  const [assigningId, setAssigningId] = React.useState('')
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [assignees, setAssignees] = React.useState<AssigneeOption[]>([])
  const [search, setSearch] = React.useState('')
  const [priorityFilter, setPriorityFilter] = React.useState('')

  const fetchAssignees = React.useCallback(async () => {
    if (!projectId) return

    try {
      const users = await userApi.list()
      setAssignees(toAssigneeOptions(users))
      return
    } catch {
      // Ignore and fallback to project members
    }

    try {
      const project = await projectApi.get(projectId)
      setAssignees(toAssigneeOptions(project.members || []))
    } catch {
      // Keep current options from task payload
    }
  }, [projectId])

  const fetchTasks = React.useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await taskApi.list({ projectId, limit: 100 })
      setTasks(res.items)
      setAssignees((prev) => mergeTaskAssignees(prev, res.items))
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务加载失败'
      push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, push])

  React.useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  React.useEffect(() => {
    fetchAssignees()
  }, [fetchAssignees])

  const filteredTasks = React.useMemo(() => {
    const text = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesText =
        !text ||
        task.title.toLowerCase().includes(text) ||
        (task.description || '').toLowerCase().includes(text)
      const matchesPriority = !priorityFilter || task.priority === priorityFilter
      return matchesText && matchesPriority
    })
  }, [priorityFilter, search, tasks])

  const grouped = React.useMemo(() => {
    return columns.reduce<Record<TaskStatus, Task[]>>((acc, column) => {
      acc[column.key] = filteredTasks.filter((task) => task.status === column.key)
      return acc
    }, {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.DONE]: [],
    })
  }, [filteredTasks])

  const moveNext = async (task: Task) => {
    const next = nextStatusMap[task.status]
    if (next === task.status) return

    setMovingId(task.id)
    try {
      await taskApi.updateStatus(task.id, next)
      push(`任务已更新为${statusLabel(next)}`, 'success')
      await fetchTasks()
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新任务失败'
      push(message, 'error')
    } finally {
      setMovingId('')
    }
  }

  const switchAssignee = async (task: Task, assigneeId: string) => {
    if (assigneeId === (task.assigneeId || '')) return

    setAssigningId(task.id)
    try {
      await taskApi.assign(task.id, assigneeId ? { assigneeId } : {})
      const assigneeName = assignees.find((person) => person.id === assigneeId)?.name || '未指派'
      push(`负责人已切换为${assigneeName}`, 'success')
      await fetchTasks()
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换负责人失败'
      push(message, 'error')
    } finally {
      setAssigningId('')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <CardHeader className="row-between">
          <div>
            <CardTitle>任务看板</CardTitle>
            <CardDescription>按状态查看任务流转，支持一键推进下一状态</CardDescription>
          </div>
          <div className="toolbar-inline">
            <Input
              className="toolbar-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索任务"
            />
            <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="">全部优先级</option>
              <option value={TaskPriority.URGENT}>紧急</option>
              <option value={TaskPriority.HIGH}>高</option>
              <option value={TaskPriority.MEDIUM}>中</option>
              <option value={TaskPriority.LOW}>低</option>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <p className="muted">任务加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="kanban-grid">
          {columns.map((column) => (
            <Card key={column.key} className="kanban-column">
              <CardHeader>
                <div className="row-between">
                  <CardTitle>{column.title}</CardTitle>
                  <Badge variant="secondary">{grouped[column.key].length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="list-stack">
                  {grouped[column.key].map((task) => (
                    <div key={task.id} className="task-board-card">
                      <div className="row-between">
                        <p className="list-item-title">{task.title}</p>
                        <Badge variant={task.priority === TaskPriority.URGENT ? 'danger' : 'secondary'}>
                          {statusLabel(task.priority)}
                        </Badge>
                      </div>
                      {task.description && <p className="muted line-clamp-2">{task.description}</p>}
                      <label className="field-block">
                        <span>负责人</span>
                        <Select
                          value={task.assigneeId || ''}
                          disabled={assigningId === task.id}
                          onChange={(event) => switchAssignee(task, event.target.value)}
                        >
                          <option value="">未指派</option>
                          {assignees.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name || person.email}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <p className="muted">更新于 {formatDate(task.updatedAt)}</p>

                      <Button
                        size="sm"
                        variant={task.status === TaskStatus.DONE ? 'secondary' : 'outline'}
                        disabled={task.status === TaskStatus.DONE || movingId === task.id}
                        onClick={() => moveNext(task)}
                      >
                        {task.status === TaskStatus.DONE ? '已完成' : `推进到 ${statusLabel(nextStatusMap[task.status])}`}
                      </Button>
                    </div>
                  ))}
                  {grouped[column.key].length === 0 && <p className="muted">暂无任务</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
