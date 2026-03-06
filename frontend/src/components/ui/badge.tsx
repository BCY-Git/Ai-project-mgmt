import * as React from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'

const classes: Record<BadgeVariant, string> = {
  default: 'ui-badge ui-badge-default',
  secondary: 'ui-badge ui-badge-secondary',
  success: 'ui-badge ui-badge-success',
  warning: 'ui-badge ui-badge-warning',
  danger: 'ui-badge ui-badge-danger',
  outline: 'ui-badge ui-badge-outline',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }): React.JSX.Element {
  return <span className={cn(classes[variant], className)} {...props} />
}
