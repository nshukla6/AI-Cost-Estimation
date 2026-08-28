import { apiRequest, buildQueryString } from '@/lib/api/config'
import type { Role } from '@/config/roles.config'
import type { User } from '@/types/domain'

export interface UserFilters {
  departmentId?: string
  role?: Role
  managerEmail?: string
}

export interface RoleOption {
  role_code: string
  role_name: string
  description: string | null
}

export const usersApi = {
  getAll: ({ departmentId, role, managerEmail }: UserFilters = {}) =>
    apiRequest<User[]>(`/users${buildQueryString({ department_id: departmentId, role, manager_email: managerEmail })}`),

  // The picker for assignRole — every role that exists, not just ones already in use.
  getRoles: () => apiRequest<RoleOption[]>('/roles'),

  // users.manage_roles only.
  assignRole: (email: string, roleCode: string) =>
    apiRequest<{ email: string; roles: string[] }>(`/users/${encodeURIComponent(email)}/roles`, {
      method: 'POST',
      body: { role_code: roleCode },
    }),

  removeRole: (email: string, roleCode: string) =>
    apiRequest<{ email: string; roles: string[] }>(`/users/${encodeURIComponent(email)}/roles/${encodeURIComponent(roleCode)}`, {
      method: 'DELETE',
    }),
}
