import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  badge?: ReactNode // e.g., card count
  onOpenChange?: (open: boolean) => void
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  badge,
  onOpenChange
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = () => {
    const newOpen = !isOpen
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <div className={cn('', className)}>
      <div
        className={cn(
          'flex items-center gap-2 w-full py-2',
          'hover:bg-accent/50 rounded-md px-2 -mx-2',
          'transition-colors duration-150',
          headerClassName
        )}
      >
        <button
          type="button"
          onClick={handleToggle}
          className="shrink-0"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div className="font-medium flex-1">{title}</div>
        {badge && (
          <span className="text-sm text-muted-foreground">{badge}</span>
        )}
      </div>

      {isOpen && (
        <div className={cn('pt-1', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}

// Simpler variant without animations for performance
interface SimpleCollapsibleProps {
  title: string
  count?: number
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function SimpleCollapsible({
  title,
  count,
  children,
  defaultOpen = true,
  className
}: SimpleCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full py-1.5 text-left hover:text-primary transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">({count})</span>
        )}
      </button>

      {isOpen && <div className="ml-5">{children}</div>}
    </div>
  )
}
