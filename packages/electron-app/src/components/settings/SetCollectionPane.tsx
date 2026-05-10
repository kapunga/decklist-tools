import { useState, useCallback, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/hooks/useStore'
import { SetCollectionQuickAdd } from '@/components/SetCollectionQuickAdd'
import { getAllSets, type ScryfallSet } from '@/lib/scryfall'
import type { SetCollectionEntry, CollectionLevel } from '@/types'

const TYPE_GROUP_LABELS: Record<string, string> = {
  expansion: 'Expansions',
  core: 'Core Sets',
  draft_innovation: 'Draft Sets',
  masters: 'Masters Sets',
  commander: 'Commander',
  funny: 'Un-Sets',
  other: 'Other',
}

const TYPE_GROUP_ORDER = ['expansion', 'draft_innovation', 'masters', 'commander', 'funny', 'other']

function getTypeGroup(setType: string): string {
  if (['expansion', 'core'].includes(setType)) return 'expansion'
  if (setType === 'draft_innovation') return 'draft_innovation'
  if (setType === 'masters') return 'masters'
  if (setType === 'commander') return 'commander'
  if (setType === 'funny') return 'funny'
  return 'other'
}

export function SetCollectionPane() {
  const setCollection = useStore(state => state.setCollection)
  const addSetToCollection = useStore(state => state.addSetToCollection)
  const updateSetInCollection = useStore(state => state.updateSetInCollection)
  const removeSetFromCollection = useStore(state => state.removeSetFromCollection)

  const [setToDelete, setSetToDelete] = useState<SetCollectionEntry | null>(null)
  const [showDeleteSetDialog, setShowDeleteSetDialog] = useState(false)
  const [allSets, setAllSets] = useState<ScryfallSet[]>([])

  useEffect(() => {
    getAllSets().then(setAllSets)
  }, [])

  const setInfo = useMemo(() => {
    const releaseYears = new Map<string, string>()
    const setTypes = new Map<string, string>()
    for (const set of allSets) {
      const code = set.code.toLowerCase()
      if (set.released_at) releaseYears.set(code, set.released_at)
      if (set.set_type) setTypes.set(code, set.set_type)
    }
    return { releaseYears, setTypes }
  }, [allSets])

  const groupedSets = useMemo(() => {
    if (!setCollection?.sets) return []

    const groups = new Map<string, SetCollectionEntry[]>()
    for (const entry of setCollection.sets) {
      const setType = setInfo.setTypes.get(entry.setCode.toLowerCase()) || 'other'
      const group = getTypeGroup(setType)
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)!.push(entry)
    }

    for (const [, entries] of groups) {
      entries.sort((a, b) => {
        const releasedA = a.releasedAt || setInfo.releaseYears.get(a.setCode.toLowerCase()) || ''
        const releasedB = b.releasedAt || setInfo.releaseYears.get(b.setCode.toLowerCase()) || ''
        return releasedB.localeCompare(releasedA)
      })
    }

    const result: Array<{ type: 'header'; label: string } | { type: 'entry'; entry: SetCollectionEntry }> = []
    for (const groupKey of TYPE_GROUP_ORDER) {
      const entries = groups.get(groupKey)
      if (entries && entries.length > 0) {
        result.push({ type: 'header', label: TYPE_GROUP_LABELS[groupKey] || groupKey })
        for (const entry of entries) result.push({ type: 'entry', entry })
      }
    }
    return result
  }, [setCollection?.sets, setInfo])

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

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Track which MTG sets you own cards from. Collection levels determine which card rarities are included in Scryfall filters.
      </p>

      <div className="mb-4">
        <SetCollectionQuickAdd
          onAdd={handleAddSet}
          existingSetCodes={setCollection?.sets.map(s => s.setCode.toLowerCase()) ?? []}
        />
      </div>

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
            <Button variant="destructive" onClick={handleDeleteSet}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
