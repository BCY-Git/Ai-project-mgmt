import * as React from 'react'
import { cn } from '@/lib/cn'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  title: string
  type: ToastType
}

type ToastContextValue = {
  push: (title: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const push = React.useCallback((title: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 10000)
    setItems((prev) => [...prev, { id, title, type }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id))
    }, 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack" aria-live="polite" role="status">
        {items.map((item) => (
          <div key={item.id} className={cn('toast-item', `toast-item-${item.type}`)}>
            {item.title}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
