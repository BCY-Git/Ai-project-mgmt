import * as React from 'react'
import { userApi, type TeamUser } from '@/api/user.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/context/auth-context'
import { formatDate, initials } from '@/lib/format'

export function TeamPage(): React.JSX.Element {
  const { user: currentUser } = useAuth()
  const { push } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [savingUserId, setSavingUserId] = React.useState('')
  const [editingUserId, setEditingUserId] = React.useState('')
  const [skillDraft, setSkillDraft] = React.useState<Record<string, string>>({})
  const [users, setUsers] = React.useState<TeamUser[]>([])

  React.useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await userApi.list()
        if (!active) return
        setUsers(result)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : '加载团队成员失败'
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

  React.useEffect(() => {
    setSkillDraft((prev) => {
      const next = { ...prev }
      for (const user of users) {
        if (next[user.id] === undefined) {
          next[user.id] = (user.skills || []).join(', ')
        }
      }
      return next
    })
  }, [users])

  const canEditSkills = React.useCallback(
    (target: TeamUser) => {
      if (!currentUser) return false
      return currentUser.role === 'admin' || currentUser.id === target.id
    },
    [currentUser],
  )

  const startEditSkills = (target: TeamUser) => {
    setEditingUserId(target.id)
    setSkillDraft((prev) => ({
      ...prev,
      [target.id]: (target.skills || []).join(', '),
    }))
  }

  const cancelEditSkills = (target: TeamUser) => {
    setEditingUserId('')
    setSkillDraft((prev) => ({
      ...prev,
      [target.id]: (target.skills || []).join(', '),
    }))
  }

  const saveSkills = async (target: TeamUser) => {
    const raw = skillDraft[target.id] ?? ''
    const nextSkills = Array.from(
      new Set(
        raw
          .split(/[\n,，;；]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    )

    setSavingUserId(target.id)
    try {
      const updated = await userApi.updateSkills(target.id, { skills: nextSkills })
      setUsers((prev) => prev.map((item) => (item.id === target.id ? { ...item, skills: updated.skills || [] } : item)))
      setEditingUserId('')
      setSkillDraft((prev) => ({ ...prev, [target.id]: (updated.skills || []).join(', ') }))
      push('技能标签更新成功', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : '技能标签更新失败'
      push(message, 'error')
    } finally {
      setSavingUserId('')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <CardHeader>
          <CardTitle>团队管理</CardTitle>
          <CardDescription>查看成员角色、技能标签与当前工作负载</CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <p className="muted">加载中...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="team-grid">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="row-between">
                <div className="avatar-item">
                  <span className="avatar-chip">{initials(user.name || user.email, 'U')}</span>
                  <div>
                    <CardTitle>{user.name || user.email}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
                <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'manager' ? 'warning' : 'secondary'}>
                  {user.role}
                </Badge>
              </CardHeader>
              <CardContent className="list-stack">
                <p className="muted">当前负载: {user.currentWorkload}</p>
                <p className="muted">状态: {user.isActive ? '在岗' : '停用'}</p>
                <p className="muted">创建于: {formatDate(user.createdAt)}</p>
                {editingUserId === user.id && canEditSkills(user) ? (
                  <div className="inline-form">
                    <label className="field-block">
                      <span>技能标签（逗号分隔）</span>
                      <Input
                        value={skillDraft[user.id] || ''}
                        onChange={(event) =>
                          setSkillDraft((prev) => ({
                            ...prev,
                            [user.id]: event.target.value,
                          }))
                        }
                        placeholder="frontend, backend, ai"
                      />
                    </label>
                    <div className="toolbar-inline">
                      <Button size="sm" disabled={savingUserId === user.id} onClick={() => saveSkills(user)}>
                        {savingUserId === user.id ? '保存中...' : '保存技能'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={savingUserId === user.id} onClick={() => cancelEditSkills(user)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tag-row">
                      {(user.skills || []).length > 0 ? (
                        user.skills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="muted">暂无技能标签</span>
                      )}
                    </div>
                    {canEditSkills(user) && (
                      <div className="toolbar-inline">
                        <Button size="sm" variant="ghost" onClick={() => startEditSkills(user)}>
                          编辑技能
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && <p className="muted">暂无成员数据</p>}
        </div>
      )}
    </div>
  )
}
