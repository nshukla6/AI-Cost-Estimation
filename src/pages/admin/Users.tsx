import { useQuery } from '@tanstack/react-query'

import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/config/roles.config'
import { usersApi } from '@/lib/api/users.api'
import { DEPARTMENTS } from '@/lib/departments'
import type { User } from '@/types/domain'

function RoleCell({ user, isManager }: { user: User; isManager: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
      {/* "Manager" isn't a role — it's whether other users have this
          person as their manager_id (GET /allocation/team eligibility). */}
      {isManager && <Badge variant="outline">Manager</Badge>}
    </div>
  )
}

export function UsersAdmin() {
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() })

  const managerIds = new Set((usersQuery.data ?? []).map((user) => user.manager_id).filter((id): id is number => id !== null))

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
    { key: 'department_id', header: 'Department', render: (row) => DEPARTMENTS.find((d) => d.id === row.department_id)?.name ?? `#${row.department_id}` },
    { key: 'role', header: 'Role', render: (row) => <RoleCell user={row} isManager={managerIds.has(row.id)} /> },
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
