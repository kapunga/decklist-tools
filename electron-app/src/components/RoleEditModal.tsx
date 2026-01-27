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
import type { RoleDefinition } from '@/types'
import { getRoleColor } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'

interface RoleEditModalProps {
  isOpen: boolean
  onClose: () => void
  customRoles: RoleDefinition[]
  onSave: (customRoles: RoleDefinition[]) => void
}

export function RoleEditModal({
  isOpen,
  onClose,
  customRoles,
  onSave
}: RoleEditModalProps) {
  const globalRoles = useGlobalRoles()
  const [editedRoles, setEditedRoles] = useState<RoleDefinition[]>(customRoles || [])
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
    const newRole: RoleDefinition = {
      id: newRoleName.toLowerCase().replace(/\s+/g, '-'),
      name: newRoleName.trim()
    }

    setEditedRoles([...roles, newRole])
    setNewRoleName('')
  }, [newRoleName, editedRoles])

  const handleDeleteRole = useCallback((id: string) => {
    setEditedRoles((editedRoles || []).filter(r => r.id !== id))
  }, [editedRoles])

  const handleStartEdit = useCallback((role: RoleDefinition) => {
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

  // Sort roles for display
  const sortedGlobalRoles = [...globalRoles].sort((a, b) => a.name.localeCompare(b.name))
  const sortedCustomRoles = [...(editedRoles || [])].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Global roles are shared across all decks. You can add custom roles specific to this deck.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* Global roles (read-only) */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Global Roles</h4>
            <div className="grid grid-cols-2 gap-2">
              {sortedGlobalRoles.map(role => (
                <div
                  key={role.id}
                  className="flex items-center gap-2 p-2 rounded-md border"
                >
                  <Badge
                    style={{ backgroundColor: role.color || getRoleColor(role.id, globalRoles) }}
                    className="text-white"
                  >
                    {role.name}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Custom roles */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Deck Custom Roles</h4>
            {sortedCustomRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No custom roles defined yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedCustomRoles.map(role => (
                  <div
                    key={role.id}
                    className="flex items-center gap-3 p-2 rounded-md border"
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
                          style={{ backgroundColor: role.color || getRoleColor(role.id, globalRoles) }}
                          className="text-white"
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
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
