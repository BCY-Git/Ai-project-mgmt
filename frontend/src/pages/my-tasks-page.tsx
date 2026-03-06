import * as React from 'react'
import { taskApi, TaskStatus, type Task } from '@/api/task.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { formatDate, statusLabel } from '@/lib/format'

function statusVariant(status: TaskStatus): 'secondary' | 'warning' | 'success' {
  if (status === TaskStatus.DONE) return 'success'
  if (status === TaskStatus.IN_PROGRESS || status === TaskStatus.REVIEW) return 'warning'
  return 'secondary'
}

export function MyTasksPage(): React.JSX.Element {
  const { push } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState('')
  const [tasks, setTasks] = React.useState<Task[]>([])

  const fetchMyTasks = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await taskApi.getMyTasks({ limit: 100 })
      setTasks(res.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载我的任务失败'
      push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [push])

  React.useEffect(() => {
    fetchMyTasks()
  }, [fetchMyTasks])

  const visibleTasks = React.useMemo(() => {
    if (!statusFilter) return tasks
    return tasks.filter((task) => task.status === statusFilter)
  }, [statusFilter, tasks])

  const setStatus = async (task: Task, status: TaskStatus) => {
    try {
      await taskApi.updateStatus(task.id, status)
      push('任务状态更新成功', 'success')
      await fetchMyTasks()
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新任务失败'
      push(message, 'error')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <CardHeader className="row-between">
          <div>
            <CardTitle>我的任务</CardTitle>
            <CardDescription>快速处理个人任务，保持看板状态更新</CardDescription>
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">全部状态</option>
            <option value={TaskStatus.TODO}>待办</option>
            <option value={TaskStatus.IN_PROGRESS}>进行中</option>
            <option value={TaskStatus.REVIEW}>评审中</option>
            <option value={TaskStatus.DONE}>已完成</option>
          </Select>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <p className="muted">任务加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="list-stack">
          {visibleTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="row-between">
                <div>
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription>{task.description || '暂无描述'}</CardDescription>
                </div>
                <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
              </CardHeader>
              <CardContent className="row-between task-row-wrap">
                <div>
                  <p className="muted">项目: {task.project?.name || '-'}</p>
                  <p className="muted">优先级: {statusLabel(task.priority)}</p>
                  <p className="muted">更新时间: {formatDate(task.updatedAt)}</p>
                </div>
                <div className="toolbar-inline">
                  <Button size="sm" variant="outline" onClick={() => setStatus(task, TaskStatus.IN_PROGRESS)}>
                    标记进行中
                  </Button>
                  <Button size="sm" onClick={() => setStatus(task, TaskStatus.DONE)}>
                    标记完成
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {visibleTasks.length === 0 && <p className="muted">暂无任务</p>}
        </div>
      )}
    </div>
  )
}
