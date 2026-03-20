import * as React from 'react'
import {
  ArrowLeft,
  Download,
  MessageCircleMore,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  SendHorizontal,
  SmilePlus,
} from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import { Link } from 'react-router-dom'
import {
  chatApi,
  ChatChannelType,
  ChatMessageType,
  type ChatChannel,
  type ChatContact,
  type ChatMessage,
} from '@/api/chat.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/context/auth-context'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const SOCKET_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3001'

function channelTitle(channel: ChatChannel, currentUserId?: string): string {
  if (channel.type === ChatChannelType.DIRECT) {
    const peer = channel.members?.find((member) => member.userId !== currentUserId)?.user
    if (peer) {
      return peer.name || peer.email
    }
  }
  if (channel.name?.trim()) return channel.name
  if (channel.type === ChatChannelType.PROJECT) return '项目群聊'
  if (channel.type === ChatChannelType.DIRECT) return '私聊会话'
  if (channel.type === ChatChannelType.ANNOUNCEMENT) return '公告频道'
  return '未命名会话'
}

type ChatPageProps = {
  fullScreen?: boolean
}

type SidebarPanelKey = 'channels' | 'contacts' | 'groups' | 'directory'

type PeopleItem = {
  id: string
  name: string
  email: string
  role?: 'admin' | 'manager' | 'member'
  isSelf?: boolean
}

function roleLabel(role?: 'admin' | 'manager' | 'member'): string {
  if (role === 'admin') return '管理员'
  if (role === 'manager') return '项目经理'
  if (role === 'member') return '成员'
  return '成员'
}

function personDisplayName(person: { name?: string | null; email?: string | null }): string {
  return person.name?.trim() || person.email?.trim() || '未命名成员'
}

export function ChatPage({ fullScreen = true }: ChatPageProps): React.JSX.Element {
  const { push } = useToast()
  const { user, accessToken } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [contactsLoading, setContactsLoading] = React.useState(true)
  const [channels, setChannels] = React.useState<ChatChannel[]>([])
  const [contacts, setContacts] = React.useState<ChatContact[]>([])
  const [activeChannelId, setActiveChannelId] = React.useState('')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [createMode, setCreateMode] = React.useState<'direct' | 'group'>('direct')
  const [newChannelName, setNewChannelName] = React.useState('')
  const [selectedContactIds, setSelectedContactIds] = React.useState<string[]>([])
  const [sidebarPanel, setSidebarPanel] = React.useState<SidebarPanelKey>('channels')
  const [memberKeyword, setMemberKeyword] = React.useState('')
  const socketRef = React.useRef<Socket | null>(null)
  const activeChannelIdRef = React.useRef('')
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const messageBottomRef = React.useRef<HTMLDivElement | null>(null)

  const activeChannel = React.useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) || null,
    [activeChannelId, channels],
  )

  const sortedChannels = React.useMemo(
    () =>
      [...channels].sort((a, b) => {
        const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
        if (pinDiff !== 0) return pinDiff
        const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt).getTime()
        const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt).getTime()
        return bTime - aTime
      }),
    [channels],
  )

  const directChannels = React.useMemo(
    () => sortedChannels.filter((channel) => channel.type === ChatChannelType.DIRECT),
    [sortedChannels],
  )

  const groupChannels = React.useMemo(
    () => sortedChannels.filter((channel) => channel.type !== ChatChannelType.DIRECT),
    [sortedChannels],
  )

  const myContacts = React.useMemo<PeopleItem[]>(() => {
    const map = new Map<string, PeopleItem>()

    directChannels.forEach((channel) => {
      const peerMember = channel.members?.find((member) => member.userId !== user?.id)
      const peer = peerMember?.user
      if (!peer?.id) return
      map.set(peer.id, {
        id: peer.id,
        name: peer.name || '',
        email: peer.email || '',
        role: peer.role,
      })
    })

    return Array.from(map.values()).sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'zh-CN'))
  }, [directChannels, user?.id])

  const companyPeople = React.useMemo<PeopleItem[]>(() => {
    const map = new Map<string, PeopleItem>()

    if (user?.id) {
      map.set(user.id, {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        role: user.role,
        isSelf: true,
      })
    }

    contacts.forEach((contact) => {
      map.set(contact.id, {
        id: contact.id,
        name: contact.name || '',
        email: contact.email || '',
        role: contact.role,
      })
    })

    return Array.from(map.values()).sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1
      if (!a.isSelf && b.isSelf) return 1
      return personDisplayName(a).localeCompare(personDisplayName(b), 'zh-CN')
    })
  }, [contacts, user?.email, user?.id, user?.name, user?.role])

  const normalizedKeyword = memberKeyword.trim().toLowerCase()

  const filteredContacts = React.useMemo(() => {
    if (!normalizedKeyword) return myContacts
    return myContacts.filter((person) => {
      const text = `${person.name} ${person.email}`.toLowerCase()
      return text.includes(normalizedKeyword)
    })
  }, [myContacts, normalizedKeyword])

  const filteredCompanyPeople = React.useMemo(() => {
    if (!normalizedKeyword) return companyPeople
    return companyPeople.filter((person) => {
      const text = `${person.name} ${person.email}`.toLowerCase()
      return text.includes(normalizedKeyword)
    })
  }, [companyPeople, normalizedKeyword])

  const fetchChannels = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await chatApi.listChannels()
      setChannels(result)
      if (result.length > 0) {
        setActiveChannelId((prev) => prev || result[0].id)
      } else {
        setActiveChannelId('')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '会话加载失败'
      push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [push])

  const fetchContacts = React.useCallback(async () => {
    setContactsLoading(true)
    try {
      const result = await chatApi.listContacts()
      setContacts(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : '联系人加载失败'
      push(message, 'error')
    } finally {
      setContactsLoading(false)
    }
  }, [push])

  const fetchMessages = React.useCallback(
    async (channelId: string) => {
      try {
        const result = await chatApi.listMessages(channelId, { limit: 50 })
        setMessages(result)
        if (result.length > 0) {
          await chatApi.markRead(channelId, result[result.length - 1].id)
          setChannels((prev) =>
            prev.map((channel) => (channel.id === channelId ? { ...channel, unreadCount: 0 } : channel)),
          )
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '消息加载失败'
        push(message, 'error')
      }
    },
    [push],
  )

  React.useEffect(() => {
    fetchChannels()
    fetchContacts()
  }, [fetchChannels, fetchContacts])

  React.useEffect(() => {
    if (!activeChannelId) {
      setMessages([])
      return
    }
    fetchMessages(activeChannelId)
  }, [activeChannelId, fetchMessages])

  React.useEffect(() => {
    activeChannelIdRef.current = activeChannelId
  }, [activeChannelId])

  React.useEffect(() => {
    if (!accessToken) return

    const socket = io(`${SOCKET_BASE_URL}/chat`, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    })

    socketRef.current = socket
    socket.on('chat:new_message', (incoming: ChatMessage) => {
      setChannels((prev) => {
        const exists = prev.some((channel) => channel.id === incoming.channelId)
        if (!exists) {
          void fetchChannels()
          return prev
        }

        return prev.map((channel) => {
          if (channel.id !== incoming.channelId) return channel
          const isActive = activeChannelIdRef.current === channel.id
          const shouldIncreaseUnread = incoming.senderId !== user?.id && !isActive
          return {
            ...channel,
            lastMessage: incoming,
            updatedAt: incoming.createdAt,
            unreadCount: shouldIncreaseUnread ? (channel.unreadCount || 0) + 1 : 0,
          }
        })
      })

      setMessages((prev) => {
        if (incoming.channelId !== activeChannelIdRef.current) return prev
        const exists = prev.some((message) => message.id === incoming.id)
        if (exists) return prev
        return [...prev, incoming]
      })

      if (incoming.channelId === activeChannelIdRef.current && incoming.senderId !== user?.id) {
        void chatApi.markRead(incoming.channelId, incoming.id).catch(() => undefined)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, fetchChannels, user?.id])

  React.useEffect(() => {
    if (!activeChannelId || !socketRef.current) return
    socketRef.current.emit('chat:join_channel', { channelId: activeChannelId })
    return () => {
      socketRef.current?.emit('chat:leave_channel', { channelId: activeChannelId })
    }
  }, [activeChannelId])

  React.useEffect(() => {
    messageBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const createChannel = async () => {
    const selected = Array.from(new Set(selectedContactIds.filter(Boolean)))

    if (createMode === 'direct' && selected.length !== 1) {
      push('私聊请选择 1 位联系人', 'error')
      return
    }
    if (createMode === 'group' && selected.length < 1) {
      push('群聊至少选择 1 位联系人', 'error')
      return
    }

    setCreating(true)
    try {
      const created = await chatApi.createChannel({
        type: createMode === 'direct' ? ChatChannelType.DIRECT : ChatChannelType.GROUP,
        name: createMode === 'group' ? newChannelName.trim() || '新群聊' : undefined,
        memberIds: selected,
      })
      setChannels((prev) => [created, ...prev.filter((channel) => channel.id !== created.id)])
      setActiveChannelId(created.id)
      setShowCreateDialog(false)
      setNewChannelName('')
      setSelectedContactIds([])
      push('会话创建成功', 'success')
      void fetchChannels()
    } catch (error) {
      const message = error instanceof Error ? error.message : '会话创建失败'
      push(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const openOrCreateDirectChat = async (person: Pick<PeopleItem, 'id' | 'name' | 'email'>) => {
    if (!person.id) return
    if (person.id === user?.id) {
      push('这是你自己的账号', 'info')
      return
    }

    const existing = channels.find(
      (channel) =>
        channel.type === ChatChannelType.DIRECT && channel.members?.some((member) => member.userId === person.id),
    )

    if (existing) {
      setActiveChannelId(existing.id)
      setSidebarPanel('channels')
      return
    }

    try {
      const created = await chatApi.createChannel({
        type: ChatChannelType.DIRECT,
        memberIds: [person.id],
      })
      setChannels((prev) => [created, ...prev.filter((channel) => channel.id !== created.id)])
      setActiveChannelId(created.id)
      setSidebarPanel('channels')
      push(`已创建和 ${personDisplayName(person)} 的私聊`, 'success')
      void fetchChannels()
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建私聊失败'
      push(message, 'error')
    }
  }

  const sendTextMessage = async () => {
    if (!activeChannelId) {
      push('请先选择会话', 'error')
      return
    }

    const content = messageInput.trim()
    if (!content) return

    setSending(true)
    try {
      const socket = socketRef.current
      if (socket && socket.connected) {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            'chat:send_message',
            {
              channelId: activeChannelId,
              message: {
                type: ChatMessageType.TEXT,
                content,
              },
            },
            (ack: ChatMessage | { message?: string }) => {
              if (ack && typeof ack === 'object' && 'id' in ack) {
                resolve()
                return
              }
              reject(new Error((ack as { message?: string })?.message || '发送失败'))
            },
          )
        })
        setMessageInput('')
      } else {
        const message = await chatApi.sendMessage(activeChannelId, {
          type: ChatMessageType.TEXT,
          content,
        })
        setMessages((prev) => [...prev, message])
        setChannels((prev) =>
          prev.map((channel) =>
            channel.id === activeChannelId
              ? {
                  ...channel,
                  lastMessage: message,
                  updatedAt: message.createdAt,
                }
              : channel,
          ),
        )
        setMessageInput('')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败'
      push(message, 'error')
    } finally {
      setSending(false)
    }
  }

  const uploadAttachment = async (file: File) => {
    if (!activeChannelId) {
      push('请先选择会话', 'error')
      return
    }

    setUploading(true)
    try {
      const message = await chatApi.sendAttachment(activeChannelId, file, messageInput.trim() || undefined)
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]))
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === activeChannelId
            ? {
                ...channel,
                lastMessage: message,
                updatedAt: message.createdAt,
              }
            : channel,
        ),
      )
      setMessageInput('')
      push('附件已发送', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : '附件发送失败'
      push(message, 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const togglePin = async (channel: ChatChannel) => {
    const next = !channel.isPinned
    setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, isPinned: next } : item)))
    try {
      await chatApi.pinChannel(channel.id, next)
    } catch (error) {
      setChannels((prev) => prev.map((item) => (item.id === channel.id ? { ...item, isPinned: !next } : item)))
      const message = error instanceof Error ? error.message : '置顶操作失败'
      push(message, 'error')
    }
  }

  const downloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      await chatApi.downloadAttachment(attachmentId, fileName)
    } catch (error) {
      const message = error instanceof Error ? error.message : '附件下载失败'
      push(message, 'error')
    }
  }

  return (
    <div className={cn(fullScreen && 'min-h-svh bg-slate-100')}>
      {fullScreen && (
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-6">
          <div>
            <p className="text-sm font-semibold">通信工作区</p>
            <p className="text-xs text-muted-foreground">全屏沟通 · 更专注的消息处理体验</p>
          </div>
          <Link className="button-link button-link-outline" to="/dashboard">
            <ArrowLeft size={14} />
            返回工作台
          </Link>
        </div>
      )}

      <div
        className={cn(
          'mx-auto grid gap-4 px-4 pb-4 md:px-6',
          fullScreen ? 'max-w-[1400px] lg:grid-cols-[320px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]',
        )}
      >
        <Card className="overflow-hidden">
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>通信工作台</CardTitle>
                <CardDescription>可查看会话、我的联系人、我的群组、公司全员</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus size={14} />
                新建会话
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={sidebarPanel === 'channels' ? 'secondary' : 'outline'}
                onClick={() => setSidebarPanel('channels')}
              >
                会话
                <Badge variant="outline">{sortedChannels.length}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sidebarPanel === 'contacts' ? 'secondary' : 'outline'}
                onClick={() => setSidebarPanel('contacts')}
              >
                我的联系人
                <Badge variant="outline">{myContacts.length}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sidebarPanel === 'groups' ? 'secondary' : 'outline'}
                onClick={() => setSidebarPanel('groups')}
              >
                我的群组
                <Badge variant="outline">{groupChannels.length}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sidebarPanel === 'directory' ? 'secondary' : 'outline'}
                onClick={() => setSidebarPanel('directory')}
              >
                公司全员
                <Badge variant="outline">{companyPeople.length}</Badge>
              </Button>
            </div>

            {(sidebarPanel === 'contacts' || sidebarPanel === 'directory') && (
              <Input
                value={memberKeyword}
                onChange={(event) => setMemberKeyword(event.target.value)}
                placeholder={sidebarPanel === 'contacts' ? '搜索我的联系人' : '搜索公司成员'}
              />
            )}
          </CardHeader>

          <CardContent className="space-y-2">
            {sidebarPanel === 'channels' && (
              <>
                {loading && <p className="muted">会话加载中...</p>}
                {!loading &&
                  sortedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        'rounded-xl border p-3 transition',
                        channel.id === activeChannelId ? 'border-teal-500 bg-teal-50' : 'border-border bg-card',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setActiveChannelId(channel.id)}
                        >
                          <p className="truncate text-sm font-semibold">{channelTitle(channel, user?.id)}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {channel.lastMessage?.content || '暂无消息'}
                          </p>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          title={channel.isPinned ? '取消置顶' : '置顶会话'}
                          onClick={() => void togglePin(channel)}
                        >
                          {channel.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                        </Button>
                      </div>
                      {(channel.unreadCount || 0) > 0 && (
                        <div className="mt-2">
                          <Badge variant="danger">{channel.unreadCount}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                {!loading && sortedChannels.length === 0 && <p className="muted">暂无会话，请先创建并选择联系人</p>}
              </>
            )}

            {sidebarPanel === 'groups' && (
              <>
                {loading && <p className="muted">群组加载中...</p>}
                {!loading &&
                  groupChannels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition',
                        channel.id === activeChannelId ? 'border-teal-500 bg-teal-50' : 'border-border bg-card',
                      )}
                      onClick={() => setActiveChannelId(channel.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{channelTitle(channel, user?.id)}</p>
                        {(channel.unreadCount || 0) > 0 && <Badge variant="danger">{channel.unreadCount}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        成员 {channel.members?.length || 0} 人 · {channel.lastMessage?.content || '暂无消息'}
                      </p>
                    </button>
                  ))}
                {!loading && groupChannels.length === 0 && <p className="muted">你还没有加入任何群组</p>}
              </>
            )}

            {sidebarPanel === 'contacts' && (
              <>
                {contactsLoading && <p className="muted">联系人加载中...</p>}
                {!contactsLoading &&
                  filteredContacts.map((person) => (
                    <div key={person.id} className="rounded-xl border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{personDisplayName(person)}</p>
                          <p className="truncate text-xs text-muted-foreground">{person.email || '-'}</p>
                          <div className="mt-1">
                            <Badge variant="outline">{roleLabel(person.role)}</Badge>
                          </div>
                        </div>
                        <Button type="button" size="xs" variant="outline" onClick={() => void openOrCreateDirectChat(person)}>
                          发消息
                        </Button>
                      </div>
                    </div>
                  ))}
                {!contactsLoading && filteredContacts.length === 0 && <p className="muted">暂无联系人，可先发起私聊</p>}
              </>
            )}

            {sidebarPanel === 'directory' && (
              <>
                {contactsLoading && <p className="muted">成员加载中...</p>}
                {!contactsLoading &&
                  filteredCompanyPeople.map((person) => (
                    <div key={person.id} className="rounded-xl border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="truncate text-sm font-semibold">{personDisplayName(person)}</p>
                            {person.isSelf && <Badge variant="secondary">我</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{person.email || '-'}</p>
                          <div className="mt-1">
                            <Badge variant="outline">{roleLabel(person.role)}</Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={person.isSelf}
                          onClick={() => void openOrCreateDirectChat(person)}
                        >
                          {person.isSelf ? '当前账号' : '发消息'}
                        </Button>
                      </div>
                    </div>
                  ))}
                {!contactsLoading && filteredCompanyPeople.length === 0 && <p className="muted">没有找到匹配的公司成员</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[680px]">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <MessageCircleMore size={18} className="text-teal-700" />
              <div>
                <CardTitle>{activeChannel ? channelTitle(activeChannel, user?.id) : '请选择会话'}</CardTitle>
                <CardDescription>已支持联系人拉取、私聊/群聊创建、未读角标、会话置顶、附件上传</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex h-[600px] flex-col gap-3 pt-4">
            <div className="flex-1 space-y-3 overflow-auto rounded-xl border bg-slate-50/70 p-3">
              {messages.map((message) => {
                const isMine = message.senderId === user?.id
                return (
                  <div
                    key={message.id}
                    className={cn('max-w-[86%] rounded-xl px-3 py-2', isMine ? 'ml-auto bg-teal-600 text-white' : 'bg-white')}
                  >
                    <p className={cn('text-xs', isMine ? 'text-teal-100' : 'text-slate-500')}>
                      {message.sender?.name || message.sender?.email || '成员'}
                    </p>
                    {message.content && <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>}
                    {(message.attachments || []).map((attachment) => (
                      <div
                        key={attachment.id}
                        className={cn(
                          'mt-2 rounded-lg border px-2 py-1 text-xs',
                          isMine ? 'border-teal-300/40 bg-teal-500/30 text-teal-50' : 'border-slate-200 bg-slate-50 text-slate-700',
                        )}
                      >
                        <p className="font-semibold">{attachment.fileName}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p>{attachment.mimeType}</p>
                          <Button
                            type="button"
                            size="xs"
                            variant={isMine ? 'outline' : 'ghost'}
                            className={cn(isMine && 'border-teal-200/60 bg-transparent text-teal-50 hover:bg-teal-500/30')}
                            onClick={() => void downloadAttachment(attachment.id, attachment.fileName)}
                          >
                            <Download size={12} />
                            下载
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className={cn('mt-1 text-[11px]', isMine ? 'text-teal-100' : 'text-slate-500')}>
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                )
              })}
              {messages.length === 0 && <p className="muted">暂无消息，开始发送第一条吧</p>}
              <div ref={messageBottomRef} />
            </div>

            <div className="rounded-xl border bg-background p-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void uploadAttachment(file)
                  }
                }}
              />
              <div className="mb-2 flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" title="表情（下一步接入）">
                  <SmilePlus size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={uploading || !activeChannelId}
                  title="上传附件（支持文件、视频、压缩包）"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={16} />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={messageInput}
                  placeholder={uploading ? '附件上传中...' : '输入消息，Enter 发送'}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendTextMessage()
                    }
                  }}
                />
                <Button
                  type="button"
                  disabled={sending || uploading || !activeChannelId}
                  onClick={() => void sendTextMessage()}
                >
                  <SendHorizontal size={15} />
                  发送
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCreateDialog && (
        <div className="modal-overlay" onClick={() => setShowCreateDialog(false)}>
          <Card className="modal-card" onClick={(event) => event.stopPropagation()}>
            <CardHeader>
              <CardTitle>新建会话</CardTitle>
              <CardDescription>可创建私聊或群聊，会自动把你加入会话</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="field-block">
                <span>会话类型</span>
                <Select value={createMode} onChange={(event) => setCreateMode(event.target.value as 'direct' | 'group')}>
                  <option value="direct">私聊</option>
                  <option value="group">群聊</option>
                </Select>
              </label>

              {createMode === 'group' && (
                <label className="field-block">
                  <span>群聊名称</span>
                  <Input
                    value={newChannelName}
                    onChange={(event) => setNewChannelName(event.target.value)}
                    placeholder="例如：产品讨论组"
                  />
                </label>
              )}

              <div className="field-block">
                <span>选择联系人</span>
                <div className="max-h-52 space-y-2 overflow-auto rounded-xl border p-2">
                  {contactsLoading && <p className="muted">联系人加载中...</p>}
                  {!contactsLoading &&
                    contacts.map((contact) => (
                      <label key={contact.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-50">
                        <input
                          type={createMode === 'direct' ? 'radio' : 'checkbox'}
                          name="chat-contact"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={(event) => {
                            if (createMode === 'direct') {
                              setSelectedContactIds(event.target.checked ? [contact.id] : [])
                            } else {
                              setSelectedContactIds((prev) =>
                                event.target.checked
                                  ? Array.from(new Set([...prev, contact.id]))
                                  : prev.filter((id) => id !== contact.id),
                              )
                            }
                          }}
                        />
                        <span className="text-sm">{contact.name || contact.email}</span>
                        <span className="text-xs text-muted-foreground">{contact.email}</span>
                      </label>
                    ))}
                  {!contactsLoading && contacts.length === 0 && <p className="muted">暂无可用联系人</p>}
                </div>
              </div>

              <div className="form-actions">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button disabled={creating || contactsLoading} onClick={() => void createChannel()}>
                  {creating ? '创建中...' : '创建会话'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
