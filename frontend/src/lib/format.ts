export function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN')
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

export function initials(name?: string | null, fallback = '?'): string {
  if (!name) return fallback
  return name.trim().slice(0, 1).toUpperCase()
}

export function statusLabel(status?: string): string {
  switch (status) {
    case 'draft':
      return '草稿'
    case 'decomposing':
      return '拆解中'
    case 'reviewing':
      return '待审核'
    case 'active':
      return '进行中'
    case 'completed':
      return '已完成'
    case 'archived':
      return '已归档'
    case 'todo':
      return '待办'
    case 'in_progress':
      return '进行中'
    case 'review':
      return '评审中'
    case 'done':
      return '已完成'
    case 'low':
      return '低'
    case 'medium':
      return '中'
    case 'high':
      return '高'
    case 'urgent':
      return '紧急'
    default:
      return status || '-'
  }
}
