import { useState, useCallback, useEffect, useMemo } from 'react'
import { ArrowLeft, Plus, MoreVertical, Pencil, Trash2, Plug, PlugZap, Loader2 } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore, useGlobalRoles } from '@/hooks/useStore'
import { ROLE_COLOR_PALETTE } from '@/lib/constants'
import { CreateRoleDialog } from '@/components/CreateRoleDialog'
import { RoleFormFields } from '@/components/RoleFormFields'
import { SetCollectionQuickAdd } from '@/components/SetCollectionQuickAdd'
import { getAllSets, type ScryfallSet } from '@/lib/scryfall'
import type { RoleDefinition, SetCollectionEntry, CollectionLevel } from '@/types'

export function SettingsPage() {
  const setView = useStore(state => state.setView)
  const globalRoles = useGlobalRoles()
  const addGlobalRole = useStore(state => state.addGlobalRole)
  const updateGlobalRole = useStore(state => state.updateGlobalRole)
  const deleteGlobalRole = useStore(state => state.deleteGlobalRole)
  const decks = useStore(state => state.decks)
  const setCollection = useStore(state => state.setCollection)
  const addSetToCollection = useStore(state => state.addSetToCollection)
  const updateSetInCollection = useStore(state => state.updateSetInCollection)
  const removeSetFromCollection = useStore(state => state.removeSetFromCollection)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [setToDelete, setSetToDelete] = useState<SetCollectionEntry | null>(null)
  const [showDeleteSetDialog, setShowDeleteSetDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null)

  // Edit form state
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleColor, setRoleColor] = useState<string>(ROLE_COLOR_PALETTE[0])

  // Claude Desktop integration state
  const [claudeConnected, setClaudeConnected] = useState(false)
  const [claudeLoading, setClaudeLoading] = useState(true)
  const [claudeError, setClaudeError] = useState<string | null>(null)

  // Scryfall sets for looking up release years
  const [allSets, setAllSets] = useState<ScryfallSet[]>([])

  // Load sets for release year lookup
  useEffect(() => {
    getAllSets().then(setAllSets)
  }, [])

  // Create lookup maps for release years and set types
  const setInfo = useMemo(() => {
    const releaseYears = new Map<string, string>()
    const setTypes = new Map<string, string>()
    for (const set of allSets) {
      const code = set.code.toLowerCase()
      if (set.released_at) {
        releaseYears.set(code, set.released_at)
      }
      if (set.set_type) {
        setTypes.set(code, set.set_type)
      }
    }
    return { releaseYears, setTypes }
  }, [allSets])

  // Group labels for set types
  const TYPE_GROUP_LABELS: Record<string, string> = {
    'expansion': 'Expansions',
    'core': 'Core Sets',
    'draft_innovation': 'Draft Sets',
    'masters': 'Masters Sets',
    'commander': 'Commander',
    'funny': 'Un-Sets',
    'other': 'Other'
  }

  // Map set types to groups
  const getTypeGroup = (setType: string): string => {
    if (['expansion', 'core'].includes(setType)) return 'expansion'
    if (setType === 'draft_innovation') return 'draft_innovation'
    if (setType === 'masters') return 'masters'
    if (setType === 'commander') return 'commander'
    if (setType === 'funny') return 'funny'
    return 'other'
  }

  const TYPE_GROUP_ORDER = ['expansion', 'draft_innovation', 'masters', 'commander', 'funny', 'other']

  // Group and sort sets by type, then by release date within each group
  const groupedSets = useMemo(() => {
    if (!setCollection?.sets) return []

    const groups = new Map<string, SetCollectionEntry[]>()

    for (const entry of setCollection.sets) {
      const setType = setInfo.setTypes.get(entry.setCode.toLowerCase()) || 'other'
      const group = getTypeGroup(setType)
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)!.push(entry)
    }

    // Sort each group by release date (most recent first)
    for (const [, entries] of groups) {
      entries.sort((a, b) => {
        const releasedA = a.releasedAt || setInfo.releaseYears.get(a.setCode.toLowerCase()) || ''
        const releasedB = b.releasedAt || setInfo.releaseYears.get(b.setCode.toLowerCase()) || ''
        return releasedB.localeCompare(releasedA)
      })
    }

    // Build ordered result with group headers
    const result: Array<{ type: 'header'; label: string } | { type: 'entry'; entry: SetCollectionEntry }> = []
    for (const groupKey of TYPE_GROUP_ORDER) {
      const entries = groups.get(groupKey)
      if (entries && entries.length > 0) {
        result.push({ type: 'header', label: TYPE_GROUP_LABELS[groupKey] || groupKey })
        for (const entry of entries) {
          result.push({ type: 'entry', entry })
        }
      }
    }

    return result
  }, [setCollection?.sets, setInfo])

  // Check Claude connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.getClaudeConnectionStatus()
        setClaudeConnected(status.connected)
      } catch (error) {
        console.error('Failed to check Claude status:', error)
      } finally {
        setClaudeLoading(false)
      }
    }
    checkStatus()
  }, [])

  const handleConnectClaude = useCallback(async () => {
    setClaudeLoading(true)
    setClaudeError(null)
    try {
      const result = await window.electronAPI.connectClaudeDesktop()
      if (result.success) {
        setClaudeConnected(true)
      } else {
        setClaudeError(result.error || 'Failed to connect')
      }
    } catch (error) {
      setClaudeError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setClaudeLoading(false)
    }
  }, [])

  const handleDisconnectClaude = useCallback(async () => {
    setClaudeLoading(true)
    setClaudeError(null)
    try {
      const result = await window.electronAPI.disconnectClaudeDesktop()
      if (result.success) {
        setClaudeConnected(false)
      } else {
        setClaudeError(result.error || 'Failed to disconnect')
      }
    } catch (error) {
      setClaudeError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setClaudeLoading(false)
    }
  }, [])

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

  // Set Collection handlers
  const handleAddSet = useCallback(async (entry: Omit<SetCollectionEntry, 'addedAt'>) => {
    await addSetToCollection(entry)
  }, [addSetToCollection])

  const handleDeleteSet = useCallback(async () => {
    if (!setToDelete) return
    await removeSetFromCollection(setToDelete.setCode)
    setSetToDelete(null)
    setShowDeleteSetDialog(false)
  }, [setToDelete, removeSetFromCollection])

  const handleInlineLevelChange = useCallback(async (setCode: string, level: CollectionLevel) => {
    await updateSetInCollection(setCode, level)
  }, [updateSetInCollection])

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

        {/* Claude Desktop Integration Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Claude Desktop Integration</h2>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {claudeConnected ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <PlugZap className="w-5 h-5 text-green-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Plug className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <div className="font-medium">
                    {claudeConnected ? 'Connected to Claude Desktop' : 'Not Connected'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {claudeConnected
                      ? 'Claude can help you manage your decks through conversation'
                      : 'Connect to use AI-powered deck building features'}
                  </p>
                </div>
              </div>
              <Button
                variant={claudeConnected ? 'outline' : 'default'}
                onClick={claudeConnected ? handleDisconnectClaude : handleConnectClaude}
                disabled={claudeLoading}
                className="gap-2"
              >
                {claudeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {claudeConnected ? 'Disconnecting...' : 'Connecting...'}
                  </>
                ) : claudeConnected ? (
                  'Disconnect'
                ) : (
                  'Connect to Claude'
                )}
              </Button>
            </div>
            {claudeError && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {claudeError}
              </div>
            )}
            {claudeConnected && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Open Claude Desktop to start managing your decks with AI assistance.
                </p>
                <p className="text-xs text-muted-foreground">
                  Note: You may need to restart Claude Desktop for changes to take effect.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Set Collection Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Set Collection</h2>

          <p className="text-sm text-muted-foreground mb-4">
            Track which MTG sets you own cards from. Collection levels determine which card rarities are included in Scryfall filters.
          </p>

          {/* Inline add bar */}
          <div className="mb-4">
            <SetCollectionQuickAdd
              onAdd={handleAddSet}
              existingSetCodes={setCollection?.sets.map(s => s.setCode.toLowerCase()) ?? []}
            />
          </div>

          {/* Set table */}
          {groupedSets.length > 0 ? (
            <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-muted sticky top-0">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium w-14">Code</th>
                    <th className="px-3 py-2 font-medium w-14">Year</th>
                    <th className="px-3 py-2 font-medium">Set Name</th>
                    <th className="px-3 py-2 font-medium w-28">Level</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupedSets.map((item) =>
                    item.type === 'header' ? (
                      <tr key={`header-${item.label}`} className="bg-muted/30">
                        <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {item.label}
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.entry.setCode} className="hover:bg-muted/20 border-t border-border/50">
                        <td className="px-3 py-1.5 uppercase text-muted-foreground font-mono text-xs">
                          {item.entry.setCode}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {(() => {
                            const released = item.entry.releasedAt || setInfo.releaseYears.get(item.entry.setCode.toLowerCase())
                            return released ? new Date(released).getFullYear() : '—'
                          })()}
                        </td>
                        <td className="px-3 py-1.5 truncate" title={item.entry.setName}>
                          {item.entry.setName}
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={String(item.entry.collectionLevel)}
                            onValueChange={(value) => handleInlineLevelChange(item.entry.setCode, Number(value) as CollectionLevel)}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {([1, 2, 3, 4] as CollectionLevel[]).map((level) => (
                                <SelectItem key={level} value={String(level)}>
                                  Level {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSetToDelete(item.entry)
                              setShowDeleteSetDialog(true)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
              No sets in your collection yet. Search above to add sets.
            </div>
          )}
        </section>

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
      <CreateRoleDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={handleAddRole}
        title="Add Global Role"
        description="Create a new role that will be available across all decks."
      />

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role definition.
            </DialogDescription>
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

      {/* Delete Set Confirmation Dialog */}
      <Dialog open={showDeleteSetDialog} onOpenChange={setShowDeleteSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Set</DialogTitle>
            <DialogDescription>
              {setToDelete && (
                <>Are you sure you want to remove "{setToDelete.setName}" from your collection?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteSetDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSet}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
