import { apiRequest, buildQueryString } from '@/lib/api/config'
import type { Role } from '@/config/roles.config'
import type { User } from '@/types/domain'

export interface UserFilters {
  departmentId?: number
  role?: Role
  managerId?: number
}

export const usersApi = {
  getAll: ({ departmentId, role, managerId }: UserFilters = {}) =>
    apiRequest<User[]>(`/users${buildQueryString({ department_id: departmentId, role, manager_id: managerId })}`),

  // ai_tool_admin only, and only settable to 'viewer' per the API design doc.
  setRole: (id: number, role: Role) =>
    apiRequest<User>(`/users/${id}/role`, {
      method: 'PUT',
      body: { role },
    }),
}
