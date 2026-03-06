import * as React from 'react'
import { cn } from '@/lib/cn'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select ref={ref} className={cn('ui-select', className)} {...props}>
        {children}
      </select>
    )
  },
)

Select.displayName = 'Select'
