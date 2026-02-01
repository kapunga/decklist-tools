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
      className="group relative inline-flex items-center px-1.5 py-0.5 text-xs rounded text-white whitespace-nowrap"
      style={{ backgroundColor: color }}
    >
      {name}
      {onRemove && !disabled && (
        <button
          className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 rounded-full bg-black text-white"
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
