import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { projectApi } from '@/api/project.api'
import { taskApi, TaskPriority, TaskStatus, type AiDecomposeTask } from '@/api/task.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'

type InputMode = 'prompt' | 'paste' | 'file'

type DraftTask = AiDecomposeTask & {
  selected: boolean
}

type CreateBatchResult = {
  successCount: number
  failedCount: number
  failures: Array<{ title: string; reason: string }>
}

const allowedFileTypes = ['txt', 'md', 'docx', 'pdf']

export function AiDecomposePage(): React.JSX.Element {
  const params = useParams<{ id: string }>()
  const projectId = params.id || ''
  const navigate = useNavigate()
  const { push } = useToast()

  const [loadingProject, setLoadingProject] = React.useState(true)
  const [decomposing, setDecomposing] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  const [inputMode, setInputMode] = React.useState<InputMode>('prompt')
  const [projectName, setProjectName] = React.useState('')
  const [projectDescription, setProjectDescription] = React.useState('')
  const [maxTasks, setMaxTasks] = React.useState(8)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [draggingFile, setDraggingFile] = React.useState(false)

  const [initialProjectName, setInitialProjectName] = React.useState('')
  const [initialProjectDescription, setInitialProjectDescription] = React.useState('')

  const [summary, setSummary] = React.useState('')
  const [totalEstimatedHours, setTotalEstimatedHours] = React.useState(0)
  const [draftTasks, setDraftTasks] = React.useState<DraftTask[]>([])
  const [batchResult, setBatchResult] = React.useState<CreateBatchResult | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const resultCardRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    let active = true

    async function loadProject() {
      if (!projectId) return
      try {
        const project = await projectApi.get(projectId)
        if (!active) return

        const nextName = project.name || ''
        const nextDescription = project.description || ''
        setProjectName(nextName)
        setProjectDescription(nextDescription)
        setInitialProjectName(nextName)
        setInitialProjectDescription(nextDescription)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : '加载项目信息失败'
        push(message, 'error')
      } finally {
        if (active) setLoadingProject(false)
      }
    }

    loadProject()
    return () => {
      active = false
    }
  }, [projectId, push])

  const selectedCount = draftTasks.filter((task) => task.selected).length
  const allSelected = draftTasks.length > 0 && selectedCount === draftTasks.length

  const applySelectedFile = React.useCallback(
    (file: File | null) => {
      if (!file) {
        setSelectedFile(null)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        push('文件大小不能超过 10MB', 'error')
        setSelectedFile(null)
        return
      }

      const extension = file.name.toLowerCase().split('.').pop() || ''
      if (!allowedFileTypes.includes(extension)) {
        push('仅支持 txt/md/docx/pdf 文件', 'error')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
    },
    [push],
  )

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    applySelectedFile(file)
    setDraggingFile(false)
    event.target.value = ''
  }

  const onDropFile = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDraggingFile(false)
    const file = event.dataTransfer.files?.[0] || null
    applySelectedFile(file)
  }

  const onDragOverFile = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingFile) {
      setDraggingFile(true)
    }
  }

  const onDragLeaveFile = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDraggingFile(false)
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setDraggingFile(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearDecomposeResult = () => {
    setSummary('')
    setTotalEstimatedHours(0)
    setDraftTasks([])
    setBatchResult(null)
  }

  const resetInput = () => {
    setInputMode('prompt')
    setProjectName(initialProjectName)
    setProjectDescription(initialProjectDescription)
    setMaxTasks(8)
    clearSelectedFile()
    setBatchResult(null)
  }

  const onDecompose = async () => {
    setBatchResult(null)

    if (inputMode === 'file' && !selectedFile) {
      push('请先上传文件', 'error')
      return
    }

    if (inputMode !== 'file' && !projectDescription.trim()) {
      push('请输入需求内容', 'error')
      return
    }

    setDecomposing(true)
    try {
      const result = await Promise.race([
        taskApi.decompose({
          projectId,
          inputMode,
          projectName: projectName || undefined,
          projectDescription: inputMode === 'file' ? undefined : projectDescription,
          maxTasks,
          file: inputMode === 'file' ? selectedFile || undefined : undefined,
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('AI 拆解超时，请稍后重试（已自动取消等待）')), 65000)
        }),
      ])

      const nextDraft = result.tasks.map((task) => ({ ...task, selected: true }))
      setSummary(result.summary)
      setTotalEstimatedHours(result.totalEstimatedHours)
      setDraftTasks(nextDraft)
      push('AI 拆解完成', 'success')

      window.setTimeout(() => {
        resultCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 拆解失败'
      push(message, 'error')
    } finally {
      setDecomposing(false)
    }
  }

  const updateDraftTask = <K extends keyof DraftTask>(index: number, key: K, value: DraftTask[K]) => {
    setDraftTasks((prev) => prev.map((task, idx) => (idx === index ? { ...task, [key]: value } : task)))
  }

  const createFromSelectedDraft = async (source: DraftTask[]) => {
    const selectedIndexes = source
      .map((task, index) => ({ task, index }))
      .filter((entry) => entry.task.selected)

    if (selectedIndexes.length === 0) {
      push('请至少选择一条任务', 'error')
      return
    }

    setCreating(true)
    const nextDraft = source.map((task) => ({ ...task }))
    const result: CreateBatchResult = {
      successCount: 0,
      failedCount: 0,
      failures: [],
    }

    try {
      for (const entry of selectedIndexes) {
        const task = nextDraft[entry.index]
        const normalizedTitle = task.title.trim()
        if (!normalizedTitle) {
          task.selected = true
          result.failedCount += 1
          result.failures.push({
            title: task.title,
            reason: '任务标题不能为空',
          })
          continue
        }

        try {
          await taskApi.create({
            projectId,
            title: normalizedTitle,
            description: task.description?.trim() || undefined,
            priority: task.priority,
            estimatedHours: Math.max(1, Number(task.estimatedHours) || 1),
            status: TaskStatus.TODO,
          })
          task.selected = false
          result.successCount += 1
        } catch (error) {
          task.selected = true
          result.failedCount += 1
          const reason = error instanceof Error ? error.message : '创建失败'
          result.failures.push({
            title: task.title,
            reason,
          })
        }
      }

      setDraftTasks(nextDraft)
      setBatchResult(result)

      if (result.failedCount === 0 && result.successCount > 0) {
        push('任务已全部创建成功', 'success')
      } else {
        push(`创建完成：成功 ${result.successCount} 条，失败 ${result.failedCount} 条`, 'info')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFromDraft = async () => {
    await createFromSelectedDraft(draftTasks)
  }

  const toggleSelectAll = (selected: boolean) => {
    setDraftTasks((prev) => prev.map((task) => ({ ...task, selected })))
  }

  const retryFailedOnly = async () => {
    if (!batchResult || batchResult.failedCount === 0) return

    const failedTitles = new Set(batchResult.failures.map((item) => item.title))
    const nextDraft = draftTasks.map((task) => ({
      ...task,
      selected: failedTitles.has(task.title),
    }))
    setDraftTasks(nextDraft)
    await createFromSelectedDraft(nextDraft)
  }

  if (loadingProject) {
    return (
      <Card>
        <CardContent>
          <p className="muted">项目加载中...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="page-stack">
      <Card>
        <CardHeader>
          <div className="row-between">
            <div>
              <CardTitle>AI 一键分解</CardTitle>
              <CardDescription>输入需求后生成任务草稿，支持编辑确认后再批量创建</CardDescription>
            </div>
            <div className="toolbar-inline">
              <Badge variant="secondary">项目: {projectName || projectId}</Badge>
              <Link className="inline-link" to={`/projects/${projectId}`}>
                返回项目
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="inline-form">
            <div className="field-block">
              <span>输入方式</span>
              <div className="mode-switch">
                <Button
                  type="button"
                  variant={inputMode === 'prompt' ? 'default' : 'outline'}
                  className="mode-switch-item"
                  onClick={() => setInputMode('prompt')}
                >
                  提示词
                </Button>
                <Button
                  type="button"
                  variant={inputMode === 'paste' ? 'default' : 'outline'}
                  className="mode-switch-item"
                  onClick={() => setInputMode('paste')}
                >
                  粘贴文档
                </Button>
                <Button
                  type="button"
                  variant={inputMode === 'file' ? 'default' : 'outline'}
                  className="mode-switch-item"
                  onClick={() => setInputMode('file')}
                >
                  文件上传
                </Button>
              </div>
            </div>

            <div className="form-grid-2">
              <label className="field-block">
                <span>项目名称(可选)</span>
                <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              </label>
              <label className="field-block">
                <span>最大任务数</span>
                <Input
                  type="number"
                  min={3}
                  max={20}
                  value={maxTasks}
                  onChange={(event) => setMaxTasks(Math.min(20, Math.max(3, Number(event.target.value) || 8)))}
                />
              </label>
            </div>

            {inputMode === 'file' ? (
              <div className="field-block">
                <span>上传需求文件 (txt/md/docx/pdf, &lt;=10MB)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.docx,.pdf"
                  onChange={onPickFile}
                  className="hidden-file-input"
                />
                <div
                  className={cn(
                    'upload-dropzone',
                    draggingFile && 'upload-dropzone-active',
                    selectedFile && 'upload-dropzone-filled',
                  )}
                  onDrop={onDropFile}
                  onDragOver={onDragOverFile}
                  onDragLeave={onDragLeaveFile}
                >
                  <p className="upload-dropzone-title">{selectedFile ? selectedFile.name : '拖拽文件到这里'}</p>
                  <p className="upload-dropzone-tip">
                    {selectedFile
                      ? '文件已选择完成，可直接发起 AI 拆解'
                      : '支持 txt / md / docx / pdf，或点击下方按钮手动选择'}
                  </p>
                  <Button type="button" variant="outline" onClick={openFilePicker}>
                    选择文件
                  </Button>
                </div>
                {selectedFile && (
                  <div className="toolbar-inline">
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelectedFile}>
                      移除文件
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <label className="field-block">
                <span>{inputMode === 'prompt' ? '提示词' : '文档内容'}</span>
                <Textarea
                  rows={10}
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="请输入需求背景、目标、范围、约束和验收标准..."
                />
                <p className="muted">
                  {inputMode === 'prompt'
                    ? '建议描述目标、关键里程碑和验收标准，AI 会输出更稳定。'
                    : '建议粘贴完整需求文档，便于 AI 更准确提取任务边界。'}
                </p>
              </label>
            )}

            <div className="toolbar-inline">
              <Button onClick={onDecompose} disabled={decomposing}>
                {decomposing ? 'AI拆解中...' : '一键分解'}
              </Button>
              <Button type="button" variant="outline" onClick={resetInput} disabled={decomposing}>
                重置输入
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {draftTasks.length > 0 && (
        <div ref={resultCardRef}>
          <Card>
            <CardHeader>
              <div className="row-between">
                <div>
                  <CardTitle>拆解结果预览</CardTitle>
                  <CardDescription>先校对标题、优先级与工时，再勾选入库</CardDescription>
                </div>
                <div className="toolbar-inline">
                  <Badge variant="success">总工时: {totalEstimatedHours}h</Badge>
                  <Badge variant="warning">已选: {selectedCount}/{draftTasks.length}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="ai-summary-alert">
                <p className="ai-summary-title">拆解摘要</p>
                <p className="ai-summary-text">{summary}</p>
              </div>

              <div className="row-between task-row-wrap table-toolbar">
                <p className="muted">草稿任务 {draftTasks.length} 条</p>
                <div className="toolbar-inline">
                  <Button type="button" size="sm" variant="ghost" onClick={() => toggleSelectAll(true)} disabled={allSelected}>
                    全选
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleSelectAll(false)}
                    disabled={selectedCount === 0}
                  >
                    清空选择
                  </Button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="ui-table ai-result-table">
                  <thead>
                    <tr>
                      <th className="ui-table-head table-col-select">入库</th>
                      <th className="ui-table-head table-col-title">任务标题</th>
                      <th className="ui-table-head table-col-description">描述</th>
                      <th className="ui-table-head table-col-priority">优先级</th>
                      <th className="ui-table-head table-col-hours">预估工时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftTasks.map((task, index) => (
                      <tr key={`${task.title}-${index}`} className="ui-table-row">
                        <td className="ui-table-cell table-col-select">
                          <input
                            type="checkbox"
                            checked={task.selected}
                            onChange={(event) => updateDraftTask(index, 'selected', event.target.checked)}
                          />
                        </td>
                        <td className="ui-table-cell table-col-title">
                          <Input value={task.title} onChange={(event) => updateDraftTask(index, 'title', event.target.value)} />
                        </td>
                        <td className="ui-table-cell table-col-description">
                          <Textarea
                            rows={2}
                            value={task.description}
                            onChange={(event) => updateDraftTask(index, 'description', event.target.value)}
                          />
                        </td>
                        <td className="ui-table-cell table-col-priority">
                          <Select
                            value={task.priority}
                            onChange={(event) => updateDraftTask(index, 'priority', event.target.value as TaskPriority)}
                          >
                            <option value={TaskPriority.LOW}>低</option>
                            <option value={TaskPriority.MEDIUM}>中</option>
                            <option value={TaskPriority.HIGH}>高</option>
                            <option value={TaskPriority.URGENT}>紧急</option>
                          </Select>
                        </td>
                        <td className="ui-table-cell table-col-hours">
                          <Input
                            type="number"
                            min={1}
                            max={999}
                            value={task.estimatedHours}
                            onChange={(event) =>
                              updateDraftTask(index, 'estimatedHours', Math.max(1, Number(event.target.value) || 1))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="row-between task-row-wrap">
                <div className="toolbar-inline">
                  <Button disabled={creating || selectedCount === 0} onClick={handleCreateFromDraft}>
                    {creating ? '创建中...' : '一键创建任务'}
                  </Button>
                  {batchResult && batchResult.failedCount > 0 && (
                    <Button variant="outline" disabled={creating || batchResult.failedCount === 0} onClick={retryFailedOnly}>
                      仅重试失败项
                    </Button>
                  )}
                  <Button variant="outline" disabled={creating} onClick={clearDecomposeResult}>
                    清空结果
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/board`)}>
                    前往任务看板
                  </Button>
                </div>
              </div>

              {batchResult && (
                <div
                  className={cn('batch-result-panel', batchResult.failedCount > 0 ? 'batch-result-warning' : 'batch-result-success')}
                >
                  <p className="batch-result-title">创建完成：成功 {batchResult.successCount} 条，失败 {batchResult.failedCount} 条</p>
                  {batchResult.failures.map((item) => (
                    <p key={`${item.title}-${item.reason}`} className="batch-result-item">
                      {item.title.trim() || '未命名任务'}：{item.reason}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
