import * as React from 'react'
import {
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/context/auth-context'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'manager' | 'member'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: '工作台',
    items: [
      { to: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
      { to: '/projects', label: '项目中心', icon: FolderKanban },
      { to: '/projects-global', label: '项目全局', icon: Globe2 },
      { to: '/chat', label: '通信', icon: MessageCircle },
      { to: '/my-tasks', label: '我的任务', icon: Sparkles },
    ],
  },
  {
    title: '管理设置',
    items: [{ to: '/team', label: '团队管理', icon: Users, roles: ['admin', 'manager'] }],
  },
]

function AppShellLayout(): React.JSX.Element {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { collapsedDesktop, setOpenMobile, toggleCollapsedDesktop } = useSidebar()

  React.useEffect(() => {
    setOpenMobile(false)
  }, [location.pathname, setOpenMobile])

  const visibleSections = React.useMemo(() => {
    const role = user?.role
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.roles || (role ? item.roles.includes(role) : false)),
      }))
      .filter((section) => section.items.length > 0)
  }, [user?.role])

  const isItemActive = React.useCallback(
    (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname],
  )

  const currentPageTitle = React.useMemo(() => {
    const allItems = visibleSections.flatMap((section) => section.items)
    const current = allItems.find((item) => isItemActive(item.to))
    return current?.label || '工作台'
  }, [isItemActive, visibleSections])

  const roleText =
    user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '项目经理' : user?.role === 'member' ? '成员' : '-'

  return (
    <>
      <Sidebar className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))]">
        <SidebarHeader className="border-b border-sidebar-border/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className={cn('flex min-w-0 items-center gap-3', collapsedDesktop && 'md:justify-center')}>
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-teal-700 to-sky-600 font-bold text-cyan-50 shadow-lg shadow-sky-800/20">
                AI
              </div>
              <div className={cn(collapsedDesktop && 'md:hidden')}>
                <p className="text-sm font-bold tracking-wide">Project Pilot</p>
                <p className="text-xs text-muted-foreground">AI 项目管理系统</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="hidden md:inline-flex"
                onClick={toggleCollapsedDesktop}
                aria-label={collapsedDesktop ? '展开侧边栏' : '收起侧边栏'}
                title={collapsedDesktop ? '展开侧边栏' : '收起侧边栏'}
              >
                {collapsedDesktop ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setOpenMobile(false)}
                aria-label="关闭侧边栏"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <div
            className={cn(
              'mb-4 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2',
              collapsedDesktop && 'md:justify-center md:px-2',
            )}
          >
            <Sparkles size={15} className="text-teal-700" />
            <div className={cn(collapsedDesktop && 'md:hidden')}>
              <p className="text-[11px] text-muted-foreground">当前空间</p>
              <p className="text-xs font-semibold text-slate-900">AI 项目协作空间</p>
            </div>
          </div>

          {visibleSections.map((section) => (
            <SidebarGroup key={section.title} className="mb-4">
              <SidebarGroupLabel className={cn(collapsedDesktop && 'md:hidden')}>{section.title}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item.to)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(active && 'shadow-inner', collapsedDesktop && 'md:justify-center md:px-2')}
                        onClick={() => setOpenMobile(false)}
                        title={item.label}
                      >
                        <NavLink to={item.to}>
                          <Icon size={16} />
                          <span className={cn(collapsedDesktop && 'md:hidden')}>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/70 p-3">
          <div
            className={cn(
              'mb-2 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 p-2',
              collapsedDesktop && 'md:justify-center',
            )}
          >
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-200 to-sky-200 text-xs font-semibold text-slate-900">
              {initials(user?.name || user?.email, 'U')}
            </span>
            <div className={cn('min-w-0', collapsedDesktop && 'md:hidden')}>
              <p className="truncate text-sm font-medium text-slate-900">{user?.name || user?.email || '未登录'}</p>
              <p className="text-xs text-muted-foreground">{roleText}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className={cn('w-full justify-start gap-2', collapsedDesktop && 'md:justify-center md:px-0')}
            onClick={logout}
            title="退出登录"
          >
            <LogOut size={15} />
            <span className={cn(collapsedDesktop && 'md:hidden')}>退出登录</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger aria-label="打开侧边栏" />
            <div>
              <p className="text-sm font-semibold">{currentPageTitle}</p>
              <p className="text-xs text-muted-foreground">AI 项目管理系统</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-200 to-sky-200 text-xs font-semibold text-slate-900">
              {initials(user?.name || user?.email, 'U')}
            </span>
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name || user?.email || '未登录'}</p>
              <p className="text-xs text-muted-foreground">{roleText}</p>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 md:px-6 md:py-5">
          <p className="mb-3 text-xs text-muted-foreground">任务拆解 · 执行看板 · 协同追踪</p>
          <Outlet />
        </main>
      </SidebarInset>
    </>
  )
}

export function AppShell(): React.JSX.Element {
  return (
    <SidebarProvider className="bg-transparent">
      <AppShellLayout />
    </SidebarProvider>
  )
}
