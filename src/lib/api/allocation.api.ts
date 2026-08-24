import { apiRequest, buildQueryString } from '@/lib/api/config'
import type { DateRangeParams, DepartmentUsage, MyUsage, OrgUsage, OrgUsageGroupBy, TeamUsage } from '@/types/domain'

export const allocationApi = {
  getMyUsage: ({ from, to }: DateRangeParams = {}) => apiRequest<MyUsage>(`/allocation/my-usage${buildQueryString({ from, to })}`),

  getTeamUsage: ({ from, to }: DateRangeParams = {}) => apiRequest<TeamUsage>(`/allocation/team${buildQueryString({ from, to })}`),

  getDepartmentUsage: (departmentId: number, { from, to }: DateRangeParams = {}) =>
    apiRequest<DepartmentUsage>(`/allocation/department/${departmentId}${buildQueryString({ from, to })}`),

  getOrgUsage: ({ from, to, groupBy }: DateRangeParams & { groupBy?: OrgUsageGroupBy } = {}) =>
    apiRequest<OrgUsage>(`/allocation/org${buildQueryString({ from, to, group_by: groupBy })}`),
}
