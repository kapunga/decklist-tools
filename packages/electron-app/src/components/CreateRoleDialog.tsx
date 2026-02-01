import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RoleFormFields } from '@/components/RoleFormFields'
import { ROLE_COLOR_PALETTE } from '@/lib/constants'
import type { RoleDefinition } from '@/types'

interface CreateRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (role: RoleDefinition) => void
  title?: string
  description?: string
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreated,
  title = 'Create Role',
  description = 'Create a new role.',
}: CreateRoleDialogProps) {
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleColor, setRoleColor] = useState<string>(ROLE_COLOR_PALETTE[0])

  const resetForm = useCallback(() => {
    setRoleName('')
    setRoleDescription('')
    setRoleColor(ROLE_COLOR_PALETTE[0])
  }, [])

  const handleCreate = useCallback(() => {
    if (!roleName.trim()) return

    const roleId = roleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const newRole: RoleDefinition = {
      id: roleId,
      name: roleName.trim(),
      description: roleDescription.trim() || undefined,
      color: roleColor,
    }

    onCreated(newRole)
    resetForm()
    onOpenChange(false)
  }, [roleName, roleDescription, roleColor, onCreated, onOpenChange, resetForm])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }, [onOpenChange, resetForm])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RoleFormFields
            roleName={roleName}
            onRoleNameChange={setRoleName}
            roleDescription={roleDescription}
            onRoleDescriptionChange={setRoleDescription}
            roleColor={roleColor}
            onRoleColorChange={setRoleColor}
            onSubmit={handleCreate}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!roleName.trim()}>Create Role</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
