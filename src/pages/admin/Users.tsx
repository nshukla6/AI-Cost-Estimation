import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuth } from '@/components/AuthContext'
import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERMISSIONS, ROLE_LABELS, type Role } from '@/config/roles.config'
import { usersApi } from '@/lib/api/users.api'
import type { User } from '@/types/domain'

function RoleCell({ user, canManage }: { user: User; canManage: boolean }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (role: Role) => usersApi.setRole(user.id, role),
    onSuccess: () => {
      toast.success('User role updated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to update user role'),
  })

  if (!canManage) {
    return <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
  }

  return (
    <Select value={user.role} onValueChange={(value) => mutation.mutate(value as Role)} disabled={mutation.isPending}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* Per the API design doc, ai_tool_admin can only set a user's role to 'viewer'. */}
        <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
        <SelectItem value="ai_cost_manager" disabled>
          {ROLE_LABELS.ai_cost_manager}
        </SelectItem>
        <SelectItem value="ai_tool_admin" disabled>
          {ROLE_LABELS.ai_tool_admin}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function UsersAdmin() {
  const { hasPermission } = useAuth()
  const canManageRoles = hasPermission(PERMISSIONS.MANAGE_USER_ROLES)
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() })

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
    { key: 'department_id', header: 'Department', render: (row) => `#${row.department_id}` },
    { key: 'role', header: 'Role', render: (row) => <RoleCell user={row} canManage={canManageRoles} /> },
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
          <DataTable columns={columns} data={usersQuery.data ?? []} rowKey={(row) => row.id} isLoading={usersQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
