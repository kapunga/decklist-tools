import { useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CustomRoleDefinition, BuiltInCardRole, CardRole } from '@/types'
import { BUILT_IN_ROLES, roleImportance } from '@/types'

interface RoleEditModalProps {
  isOpen: boolean
  onClose: () => void
  customRoles: CustomRoleDefinition[]
  onSave: (customRoles: CustomRoleDefinition[]) => void
  // If provided, assigns role to this card on confirm
  cardToAssign?: { name: string; currentRole: CardRole }
  onAssignRole?: (role: CardRole) => void
}

const BUILT_IN_ROLE_DESCRIPTIONS: Record<BuiltInCardRole, string> = {
  commander: 'The deck\'s commander(s)',
  core: 'Essential cards that define the strategy',
  enabler: 'Cards that make the strategy work',
  support: 'Cards that enhance or protect the strategy',
  flex: 'Flexible slots that can be swapped',
  land: 'Mana-producing lands'
}

const BUILT_IN_ROLE_COLORS: Record<BuiltInCardRole, string> = {
  commander: 'bg-purple-600',
  core: 'bg-blue-600',
  enabler: 'bg-green-600',
  support: 'bg-yellow-600',
  flex: 'bg-orange-600',
  land: 'bg-stone-600'
}

export function RoleEditModal({
  isOpen,
  onClose,
  customRoles,
  onSave,
  cardToAssign,
  onAssignRole
}: RoleEditModalProps) {
  const [editedRoles, setEditedRoles] = useState<CustomRoleDefinition[]>(customRoles || [])
  const [newRoleName, setNewRoleName] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')

  // Reset state when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    } else {
      setEditedRoles(customRoles || [])
      setNewRoleName('')
      setEditingRoleId(null)
    }
  }

  const handleAddRole = useCallback(() => {
    if (!newRoleName.trim()) return

    const roles = editedRoles || []
    const newRole: CustomRoleDefinition = {
      id: newRoleName.toLowerCase().replace(/\s+/g, '-'),
      name: newRoleName.trim(),
      sortOrder: roles.length > 0
        ? Math.max(...roles.map(r => r.sortOrder)) + 1
        : 1
    }

    setEditedRoles([...roles, newRole])
    setNewRoleName('')
  }, [newRoleName, editedRoles])

  const handleDeleteRole = useCallback((id: string) => {
    setEditedRoles((editedRoles || []).filter(r => r.id !== id))
  }, [editedRoles])

  const handleStartEdit = useCallback((role: CustomRoleDefinition) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingRoleId || !editingRoleName.trim()) return

    setEditedRoles((editedRoles || []).map(r =>
      r.id === editingRoleId ? { ...r, name: editingRoleName.trim() } : r
    ))
    setEditingRoleId(null)
    setEditingRoleName('')
  }, [editingRoleId, editingRoleName, editedRoles])

  const handleSave = useCallback(() => {
    onSave(editedRoles || [])
    onClose()
  }, [editedRoles, onSave, onClose])

  const handleSelectRole = useCallback((role: CardRole) => {
    if (onAssignRole) {
      onAssignRole(role)
      onClose()
    }
  }, [onAssignRole, onClose])

  // Sort roles for display
  const sortedBuiltInRoles = [...BUILT_IN_ROLES].sort(
    (a, b) => roleImportance[b] - roleImportance[a]
  )
  const sortedCustomRoles = [...(editedRoles || [])].sort(
    (a, b) => b.sortOrder - a.sortOrder
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {cardToAssign ? `Assign Role to ${cardToAssign.name}` : 'Manage Roles'}
          </DialogTitle>
          <DialogDescription>
            {cardToAssign
              ? 'Select a role for this card. You can also create custom roles.'
              : 'Manage custom roles for your deck. Built-in roles cannot be modified.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* Built-in roles */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Built-in Roles</h4>
            <div className="space-y-2">
              {sortedBuiltInRoles.map(role => (
                <div
                  key={role}
                  className={`flex items-center gap-3 p-2 rounded-md border ${
                    cardToAssign ? 'cursor-pointer hover:bg-accent' : ''
                  } ${cardToAssign?.currentRole === role ? 'bg-accent' : ''}`}
                  onClick={() => cardToAssign && handleSelectRole(role)}
                >
                  <Badge className={BUILT_IN_ROLE_COLORS[role]}>
                    {role}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex-1">
                    {BUILT_IN_ROLE_DESCRIPTIONS[role]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom roles */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Custom Roles</h4>
            {sortedCustomRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No custom roles defined yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedCustomRoles.map(role => (
                  <div
                    key={role.id}
                    className={`flex items-center gap-3 p-2 rounded-md border ${
                      cardToAssign ? 'cursor-pointer hover:bg-accent' : ''
                    } ${cardToAssign?.currentRole === role.id ? 'bg-accent' : ''}`}
                    onClick={() => cardToAssign && handleSelectRole(role.id)}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

                    {editingRoleId === role.id ? (
                      <Input
                        value={editingRoleName}
                        onChange={e => setEditingRoleName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') {
                            setEditingRoleId(null)
                            setEditingRoleName('')
                          }
                        }}
                        autoFocus
                        className="h-7 text-sm"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <Badge
                          variant="outline"
                          style={role.color ? { backgroundColor: role.color } : undefined}
                        >
                          {role.name}
                        </Badge>
                        {role.description && (
                          <span className="text-sm text-muted-foreground flex-1">
                            {role.description}
                          </span>
                        )}
                      </>
                    )}

                    {!cardToAssign && (
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={e => {
                            e.stopPropagation()
                            handleStartEdit(role)
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteRole(role.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new role */}
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="New role name..."
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddRole}
                disabled={!newRoleName.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!cardToAssign && (
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
