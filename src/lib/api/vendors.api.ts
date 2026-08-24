import { apiRequest, buildQueryString } from '@/lib/api/config'
import type { Vendor } from '@/types/domain'

export const vendorsApi = {
  getAll: (isActive?: boolean) => apiRequest<Vendor[]>(`/vendors${buildQueryString({ is_active: isActive })}`),

  setActive: (id: number, isActive: boolean) =>
    apiRequest<Vendor>(`/vendors/${id}`, {
      method: 'PUT',
      body: { is_active: isActive },
    }),
}
