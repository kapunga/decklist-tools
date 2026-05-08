import { useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useStore, useGlobalRoles } from '@/hooks/useStore'
import { ROLE_COLOR_PALETTE } from '@/lib/constants'
import { CreateRoleDialog } from '@/components/CreateRoleDialog'
import { RoleFormFields } from '@/components/RoleFormFields'
import type { RoleDefinition } from '@/types'
import { getAllDeckEntries } from '@mtg-deckbuilder/shared'

export function RolesPane() {
  const globalRoles = useGlobalRoles()
  const addGlobalRole = useStore(state => state.addGlobalRole)
  const updateGlobalRole = useStore(state => state.updateGlobalRole)
  const deleteGlobalRole = useStore(state => state.deleteGlobalRole)
  const decks = useStore(state => state.decks)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null)

  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleColor, setRoleColor] = useState<string>(ROLE_COLOR_PALETTE[0])

  const resetForm = useCallback(() => {
    setRoleName('')
    setRoleDescription('')
    setRoleColor(ROLE_COLOR_PALETTE[0])
    setEditingRole(null)
  }, [])

  const handleAddRole = useCallback(async (role: RoleDefinition) => {
    await addGlobalRole(role)
  }, [addGlobalRole])

  const handleEditRole = useCallback(async () => {
    if (!editingRole || !roleName.trim()) return
    await updateGlobalRole(editingRole.id, {
      name: roleName.trim(),
      description: roleDescription.trim() || undefined,
      color: roleColor,
    })
    resetForm()
    setShowEditDialog(false)
  }, [editingRole, roleName, roleDescription, roleColor, updateGlobalRole, resetForm])

  const handleDeleteRole = useCallback(async () => {
    if (!roleToDelete) return
    await deleteGlobalRole(roleToDelete.id)
    setRoleToDelete(null)
    setShowDeleteDialog(false)
  }, [roleToDelete, deleteGlobalRole])

  const openEditDialog = useCallback((role: RoleDefinition) => {
    setEditingRole(role)
    setRoleName(role.name)
    setRoleDescription(role.description || '')
    setRoleColor(role.color || ROLE_COLOR_PALETTE[0])
    setShowEditDialog(true)
  }, [])

  const openDeleteDialog = useCallback((role: RoleDefinition) => {
    setRoleToDelete(role)
    setShowDeleteDialog(true)
  }, [])

  const roleUsageMap = useMemo(() => {
    const map = new Map<string, { cardCount: number; deckCount: number }>()
    for (const deck of decks) {
      const seenInDeck = new Set<string>()
      for (const entry of getAllDeckEntries(deck)) {
        for (const roleId of entry.roles) {
          const current = map.get(roleId) ?? { cardCount: 0, deckCount: 0 }
          current.cardCount += 1
          if (!seenInDeck.has(roleId)) {
            current.deckCount += 1
            seenInDeck.add(roleId)
          }
          map.set(roleId, current)
        }
      }
    }
    return map
  }, [decks])

  const getRoleUsage = useCallback((roleId: string) => {
    return roleUsageMap.get(roleId) ?? { cardCount: 0, deckCount: 0 }
  }, [roleUsageMap])

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-sm text-muted-foreground">
          Global roles are available across all decks. Hover for details, click to edit.
        </p>
        <Button
          onClick={() => {
            resetForm()
            setShowAddDialog(true)
          }}
          size="sm"
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </Button>
      </div>

      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap gap-2">
          {globalRoles.map(role => {
            const { cardCount, deckCount } = getRoleUsage(role.id)
            return (
              <Tooltip key={role.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => openEditDialog(role)}
                    className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-card hover:bg-accent transition-colors text-sm"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color || '#888' }}
                    />
                    <span className="font-medium">{role.name}</span>
                    {deckCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Layers className="w-3 h-3" />
                        {deckCount}
                      </span>
                    )}
                    <Trash2
                      className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteDialog(role)
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    {role.description && <p className="text-sm">{role.description}</p>}
                    {cardCount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Used by {cardCount} card{cardCount !== 1 ? 's' : ''} in {deckCount} deck{deckCount !== 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not used yet</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>

      {globalRoles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No global roles defined. Add some roles to get started.
        </div>
      )}

      <CreateRoleDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={handleAddRole}
        title="Add Global Role"
        description="Create a new role that will be available across all decks."
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update the role definition.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RoleFormFields
              roleName={roleName}
              onRoleNameChange={setRoleName}
              roleDescription={roleDescription}
              onRoleDescriptionChange={setRoleDescription}
              roleColor={roleColor}
              onRoleColorChange={setRoleColor}
              onSubmit={handleEditRole}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={!roleName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              {roleToDelete && (() => {
                const { cardCount, deckCount } = getRoleUsage(roleToDelete.id)
                if (cardCount > 0) {
                  return `This role is used by ${cardCount} card${cardCount !== 1 ? 's' : ''} across ${deckCount} deck${deckCount !== 1 ? 's' : ''}. Are you sure you want to delete "${roleToDelete.name}"? Cards will keep the role ID but it won't appear in the role list.`
                }
                return `Are you sure you want to delete "${roleToDelete.name}"? This action cannot be undone.`
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
