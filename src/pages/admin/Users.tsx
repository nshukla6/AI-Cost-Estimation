import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/components/AuthContext'
import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERMISSIONS, ROLE_LABELS, type Role } from '@/config/roles.config'
import { ApiError } from '@/lib/api/config'
import { usersApi, type RoleOption } from '@/lib/api/users.api'
import { DEPARTMENTS } from '@/lib/departments'
import type { User } from '@/types/domain'

interface RoleCellProps {
  user: User
  isManager: boolean
  canManageRoles: boolean
  availableRoles: RoleOption[]
  onAssign: (email: string, roleCode: string) => void
  onRemove: (email: string, roleCode: string) => void
}

function RoleCell({ user, isManager, canManageRoles, availableRoles, onAssign, onRemove }: RoleCellProps) {
  const assignable = availableRoles.filter((role) => !user.roles.includes(role.role_code as Role))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.roles.map((role) => (
        <Badge key={role} variant="secondary" className="gap-1 pr-1">
          {ROLE_LABELS[role] ?? role}
          {canManageRoles && (
            <button
              type="button"
              onClick={() => onRemove(user.email, role)}
              aria-label={`Remove ${ROLE_LABELS[role] ?? role}`}
              className="rounded-full hover:bg-black/10"
            >
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      {/* "Manager" isn't a role — it's whether other users have this
          person as their manager_email (GET /allocation/team eligibility). */}
      {isManager && <Badge variant="outline">Manager</Badge>}
      {canManageRoles && assignable.length > 0 && (
        // Controlled to a constant empty value — this is a one-shot picker,
        // not a persistent selection, and the just-picked role drops out of
        // `assignable` immediately after, so an uncontrolled Select would
        // have no matching item left to render a label for (blank trigger).
        <Select value="" onValueChange={(value) => onAssign(user.email, value)}>
          <SelectTrigger className="h-7 w-auto gap-1 border-dashed px-2 text-xs">
            <SelectValue placeholder="+ Add role" />
          </SelectTrigger>
          <SelectContent>
            {assignable.map((role) => (
              <SelectItem key={role.role_code} value={role.role_code}>
                {role.role_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function UsersAdmin() {
  const { hasPermission } = useAuth()
  const canManageRoles = hasPermission(PERMISSIONS.MANAGE_USER_ROLES)
  const queryClient = useQueryClient()

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() })
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: () => usersApi.getRoles(), enabled: canManageRoles })

  const assignMutation = useMutation({
    mutationFn: ({ email, roleCode }: { email: string; roleCode: string }) => usersApi.assignRole(email, roleCode),
    onSuccess: () => {
      toast.success('Role assigned')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Failed to assign role'),
  })

  const removeMutation = useMutation({
    mutationFn: ({ email, roleCode }: { email: string; roleCode: string }) => usersApi.removeRole(email, roleCode),
    onSuccess: () => {
      toast.success('Role removed')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Failed to remove role'),
  })

  const managerEmails = new Set((usersQuery.data ?? []).map((user) => user.manager_email).filter((email): email is string => email !== null))

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name ?? row.email },
    { key: 'email', header: 'Email', render: (row) => row.email },
    {
      key: 'department_id',
      header: 'Department',
      render: (row) => DEPARTMENTS.find((department) => department.id === row.department_id)?.name ?? row.department_id ?? '—',
    },
    {
      key: 'roles',
      header: 'Role',
      render: (row) => (
        <RoleCell
          user={row}
          isManager={managerEmails.has(row.email)}
          canManageRoles={canManageRoles}
          availableRoles={rolesQuery.data ?? []}
          onAssign={(email, roleCode) => assignMutation.mutate({ email, roleCode })}
          onRemove={(email, roleCode) => removeMutation.mutate({ email, roleCode })}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">All users with AI tool access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={usersQuery.data ?? []} rowKey={(row) => row.email} isLoading={usersQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
