import * as React from 'react'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SidebarContextValue = {
  openMobile: boolean
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>
  toggleMobile: () => void
  collapsedDesktop: boolean
  setCollapsedDesktop: React.Dispatch<React.SetStateAction<boolean>>
  toggleCollapsedDesktop: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

function SidebarProvider({ className, children }: React.ComponentProps<'div'>): React.JSX.Element {
  const [openMobile, setOpenMobile] = React.useState(false)
  const [collapsedDesktop, setCollapsedDesktop] = React.useState(false)
  const toggleMobile = React.useCallback(() => {
    setOpenMobile((prev) => !prev)
  }, [])
  const toggleCollapsedDesktop = React.useCallback(() => {
    setCollapsedDesktop((prev) => !prev)
  }, [])

  const value = React.useMemo(
    () => ({
      openMobile,
      setOpenMobile,
      toggleMobile,
      collapsedDesktop,
      setCollapsedDesktop,
      toggleCollapsedDesktop,
    }),
    [collapsedDesktop, openMobile, toggleCollapsedDesktop, toggleMobile],
  )

  return (
    <SidebarContext.Provider value={value}>
      <div data-slot="sidebar-provider" className={cn('flex h-svh w-full overflow-hidden', className)}>
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<HTMLElement, React.ComponentProps<'aside'>>(({ className, children, ...props }, ref) => {
  const { openMobile, setOpenMobile, collapsedDesktop } = useSidebar()

  return (
    <>
      <button
        type="button"
        aria-label="关闭侧边栏"
        onClick={() => setOpenMobile(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden',
          openMobile ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        ref={ref}
        data-slot="sidebar"
        data-open={openMobile}
        data-collapsed={collapsedDesktop}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200 md:static md:z-auto md:translate-x-0',
          collapsedDesktop ? 'md:w-16' : 'md:w-72',
          openMobile ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  )
})
Sidebar.displayName = 'Sidebar'

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="sidebar-header" className={cn('flex flex-col gap-2', className)} {...props} />
))
SidebarHeader.displayName = 'SidebarHeader'

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="sidebar-content" className={cn('flex-1 overflow-auto', className)} {...props} />
))
SidebarContent.displayName = 'SidebarContent'

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="sidebar-footer" className={cn('mt-auto', className)} {...props} />
))
SidebarFooter.displayName = 'SidebarFooter'

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'section'>>(({ className, ...props }, ref) => (
  <section ref={ref} data-slot="sidebar-group" className={cn('flex flex-col gap-2', className)} {...props} />
))
SidebarGroup.displayName = 'SidebarGroup'

const SidebarGroupLabel = React.forwardRef<HTMLParagraphElement, React.ComponentProps<'p'>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="sidebar-group-label"
      className={cn('px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground', className)}
      {...props}
    />
  ),
)
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(({ className, ...props }, ref) => (
  <ul ref={ref} data-slot="sidebar-menu" className={cn('flex flex-col gap-1', className)} {...props} />
))
SidebarMenu.displayName = 'SidebarMenu'

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(({ className, ...props }, ref) => (
  <li ref={ref} data-slot="sidebar-menu-item" className={cn('list-none', className)} {...props} />
))
SidebarMenuItem.displayName = 'SidebarMenuItem'

type SidebarMenuButtonProps = React.ComponentProps<typeof Button> & {
  isActive?: boolean
}

function SidebarMenuButton({
  className,
  variant,
  size = 'sm',
  isActive = false,
  ...props
}: SidebarMenuButtonProps): React.JSX.Element {
  return (
    <Button
      data-slot="sidebar-menu-button"
      variant={variant || (isActive ? 'secondary' : 'ghost')}
      size={size}
      className={cn(
        'h-9 w-full justify-start gap-2 rounded-lg px-2.5 text-sm font-medium',
        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent',
        className,
      )}
      {...props}
    />
  )
}

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-inset"
    className={cn('flex min-h-0 min-w-0 flex-1 flex-col bg-background', className)}
    {...props}
  />
))
SidebarInset.displayName = 'SidebarInset'

const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, onClick, children, ...props }, ref) => {
    const { toggleMobile } = useSidebar()

    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn('md:hidden', className)}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            toggleMobile()
          }
        }}
        {...props}
      >
        {children || <PanelLeft size={16} />}
      </Button>
    )
  },
)
SidebarTrigger.displayName = 'SidebarTrigger'

export {
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
}
