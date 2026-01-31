import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ROLE_COLOR_PALETTE } from '@/lib/constants'

interface RoleFormFieldsProps {
  roleName: string
  onRoleNameChange: (name: string) => void
  roleDescription: string
  onRoleDescriptionChange: (desc: string) => void
  roleColor: string
  onRoleColorChange: (color: string) => void
  onSubmit?: () => void
}

export function RoleFormFields({
  roleName,
  onRoleNameChange,
  roleDescription,
  onRoleDescriptionChange,
  roleColor,
  onRoleColorChange,
  onSubmit,
}: RoleFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          placeholder="e.g., Card Draw"
          value={roleName}
          onChange={e => onRoleNameChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="e.g., Draws additional cards"
          value={roleDescription}
          onChange={e => onRoleDescriptionChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Color</label>
        <div className="flex flex-wrap gap-2">
          {ROLE_COLOR_PALETTE.map(color => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                roleColor === color ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onRoleColorChange(color)}
            />
          ))}
        </div>
      </div>
      <div className="pt-2">
        <label className="text-sm font-medium">Preview</label>
        <div className="mt-2">
          <Badge style={{ backgroundColor: roleColor }} className="text-white">
            {roleName || 'Role Name'}
          </Badge>
        </div>
      </div>
    </div>
  )
}
