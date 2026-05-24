import { X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getRoleColor, getRoleById } from '@/lib/constants'
import type { RoleDefinition } from '@/types'

interface RolePillProps {
  roleId: string
  globalRoles?: RoleDefinition[]
  customRoles?: RoleDefinition[]
  onRemove?: () => void
  disabled?: boolean
}

export function RolePill({ roleId, globalRoles, customRoles, onRemove, disabled = false }: RolePillProps) {
  const role = getRoleById(roleId, globalRoles, customRoles)
  const color = getRoleColor(roleId, globalRoles, customRoles)
  const name = role?.name || roleId
  const description = role?.description

  const pill = (
    <span
      className="group relative inline-flex items-center whitespace-nowrap"
      style={{
        padding: '2px 8px',
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        fontFamily: 'var(--font-body)',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {name}
      {onRemove && !disabled && (
        <button
          className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 text-[color:var(--background)]"
          style={{ backgroundColor: 'var(--foreground)' }}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  )

  if (description) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {pill}
          </TooltipTrigger>
          <TooltipContent>
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return pill
}
