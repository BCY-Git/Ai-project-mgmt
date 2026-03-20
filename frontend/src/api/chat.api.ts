import http from './http'

export enum ChatChannelType {
  PROJECT = 'project_channel',
  DIRECT = 'direct',
  GROUP = 'group',
  ANNOUNCEMENT = 'announcement',
}

export enum ChatMessageType {
  TEXT = 'text',
  EMOJI = 'emoji',
  IMAGE = 'image',
  FILE = 'file',
  VIDEO = 'video',
  AUDIO = 'audio',
  ZIP = 'zip',
  SYSTEM = 'system',
}

export type ChatUser = {
  id: string
  name: string
  email: string
  role?: 'admin' | 'manager' | 'member'
}

export type ChatContact = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'member'
}

export type ChatMessage = {
  id: string
  channelId: string
  senderId: string
  sender?: ChatUser
  type: ChatMessageType
  content: string | null
  replyToMessageId: string | null
  attachments?: Array<{
    id: string
    fileName: string
    mimeType: string
    size: string
  }>
  createdAt: string
  updatedAt: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

function getAttachmentNameFromHeader(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const defaultMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (defaultMatch?.[1]) {
    return defaultMatch[1]
  }

  return null
}

export type ChatChannel = {
  id: string
  type: ChatChannelType
  name: string | null
  projectId: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  isPinned?: boolean
  unreadCount?: number
  members?: Array<{
    id: string
    userId: string
    role: 'owner' | 'admin' | 'member'
    user?: ChatUser
  }>
  lastMessage?: ChatMessage | null
}

type CreateChannelParams = {
  type: ChatChannelType
  name?: string
  projectId?: string
  memberIds?: string[]
}

type SendMessageParams = {
  type: ChatMessageType
  content?: string
  replyToMessageId?: string
}

export const chatApi = {
  listContacts(): Promise<ChatContact[]> {
    return http.get('/chat/contacts')
  },

  listChannels(): Promise<ChatChannel[]> {
    return http.get('/chat/channels')
  },

  createChannel(params: CreateChannelParams): Promise<ChatChannel> {
    return http.post('/chat/channels', params)
  },

  listMessages(channelId: string, params?: { before?: string; limit?: number }): Promise<ChatMessage[]> {
    const search = new URLSearchParams()
    if (params?.before) search.append('before', params.before)
    if (params?.limit !== undefined) search.append('limit', String(params.limit))
    return http.get(`/chat/channels/${channelId}/messages?${search.toString()}`)
  },

  sendMessage(channelId: string, params: SendMessageParams): Promise<ChatMessage> {
    return http.post(`/chat/channels/${channelId}/messages`, params)
  },

  markRead(channelId: string, messageId: string): Promise<void> {
    return http.post(`/chat/channels/${channelId}/read`, { messageId })
  },

  pinChannel(channelId: string, pinned: boolean): Promise<void> {
    return http.post(`/chat/channels/${channelId}/pin`, { pinned })
  },

  sendAttachment(channelId: string, file: File, content?: string): Promise<ChatMessage> {
    const formData = new FormData()
    formData.append('file', file)
    if (content?.trim()) {
      formData.append('content', content.trim())
    }
    return http.post(`/chat/channels/${channelId}/attachments`, formData)
  },

  async downloadAttachment(attachmentId: string, fallbackFileName?: string): Promise<void> {
    const token = localStorage.getItem('accessToken')
    const response = await fetch(`${apiBaseUrl}/chat/attachments/${attachmentId}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })

    if (!response.ok) {
      let errorMessage = '附件下载失败'
      try {
        const json = (await response.json()) as { message?: string }
        if (json?.message) {
          errorMessage = json.message
        }
      } catch {
        // ignore json parse errors
      }
      throw new Error(errorMessage)
    }

    const blob = await response.blob()
    const headerName = getAttachmentNameFromHeader(response.headers.get('content-disposition'))
    const fileName = headerName || fallbackFileName || 'attachment'
    const objectUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(objectUrl)
  },
}
