import { useState, useCallback } from 'react'
import { ArrowLeft, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore, useGlobalRoles } from '@/hooks/useStore'
import { ROLE_COLOR_PALETTE } from '@/lib/constants'
import type { RoleDefinition } from '@/types'

export function SettingsPage() {
  const setView = useStore(state => state.setView)
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

  // Form state
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleColor, setRoleColor] = useState<string>(ROLE_COLOR_PALETTE[0])

  const resetForm = useCallback(() => {
    setRoleName('')
    setRoleDescription('')
    setRoleColor(ROLE_COLOR_PALETTE[0])
    setEditingRole(null)
  }, [])

  const handleAddRole = useCallback(async () => {
    if (!roleName.trim()) return

    const roleId = roleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const newRole: RoleDefinition = {
      id: roleId,
      name: roleName.trim(),
      description: roleDescription.trim() || undefined,
      color: roleColor
    }

    await addGlobalRole(newRole)
    resetForm()
    setShowAddDialog(false)
  }, [roleName, roleDescription, roleColor, addGlobalRole, resetForm])

  const handleEditRole = useCallback(async () => {
    if (!editingRole || !roleName.trim()) return

    await updateGlobalRole(editingRole.id, {
      name: roleName.trim(),
      description: roleDescription.trim() || undefined,
      color: roleColor
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

  // Count how many cards/decks use a role
  const getRoleUsage = useCallback((roleId: string) => {
    let cardCount = 0
    let deckCount = 0

    decks.forEach(deck => {
      const allCards = [...deck.cards, ...deck.alternates, ...deck.sideboard]
      const cardsWithRole = allCards.filter(c => c.roles.includes(roleId))
      if (cardsWithRole.length > 0) {
        deckCount++
        cardCount += cardsWithRole.length
      }
    })

    return { cardCount, deckCount }
  }, [decks])

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('decks')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Decks
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Global Roles Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Global Roles</h2>
            <Button
              onClick={() => {
                resetForm()
                setShowAddDialog(true)
              }}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Role
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Global roles are available across all decks. You can customize the role definitions here.
          </p>

          <div className="space-y-2">
            {globalRoles.map(role => {
              const { cardCount, deckCount } = getRoleUsage(role.id)
              return (
                <div
                  key={role.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: role.color || '#888' }}
                    />
                    <div>
                      <div className="font-medium">{role.name}</div>
                      {role.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {role.description}
                        </p>
                      )}
                      {cardCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Used by {cardCount} card{cardCount !== 1 ? 's' : ''} in {deckCount} deck{deckCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(role)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(role)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>

          {globalRoles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No global roles defined. Add some roles to get started.
            </div>
          )}
        </section>
      </div>

      {/* Add Role Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Global Role</DialogTitle>
            <DialogDescription>
              Create a new role that will be available across all decks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Card Draw"
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddRole()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="e.g., Draws additional cards"
                value={roleDescription}
                onChange={e => setRoleDescription(e.target.value)}
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
                    onClick={() => setRoleColor(color)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={!roleName.trim()}>
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role definition.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Card Draw"
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEditRole()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="e.g., Draws additional cards"
                value={roleDescription}
                onChange={e => setRoleDescription(e.target.value)}
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
                    onClick={() => setRoleColor(color)}
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

      {/* Delete Confirmation Dialog */}
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
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
