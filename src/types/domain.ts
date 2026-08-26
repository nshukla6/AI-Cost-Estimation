import type { Role } from '@/config/roles.config'

export interface AuthUser {
  id: number
  name: string
  role: Role
  department_id: number
  manager_id: number | null
}

export interface Department {
  id: number
  name: string
}

export interface Vendor {
  id: number
  name: string
  is_active: boolean
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  department_id: number
  manager_id: number | null
}

export interface CostUpload {
  id: number
  vendor_id: number
  cost_month: string
  version: number
  status: 'success' | 'failed'
  file_name?: string
  uploaded_by?: { id: number; name: string }
  uploaded_at?: string
  record_count?: number
  blob_path?: string
}

export interface MyUsageBreakdownEntry {
  vendor: string
  cost_month: string
  amount_usd: number
}

export interface MyUsage {
  user_id: number
  total_usd: number
  breakdown: MyUsageBreakdownEntry[]
}

export interface TeamUsageEntry {
  user_id: number
  user_name: string
  amount_usd: number
}

export interface TeamUsage {
  manager_id: number
  total_usd: number
  by_user: TeamUsageEntry[]
}

export interface DepartmentUsage {
  department_id: number
  department_name: string
  total_usd: number
  by_user: TeamUsageEntry[]
  // Not in the API design doc yet (GET /allocation/department/{id}) — the
  // mock backend adds it; a real backend would need the same field.
  by_vendor: OrgUsageBreakdownEntry[]
}

export type OrgUsageGroupBy = 'department' | 'vendor' | 'user' | 'org'

export interface OrgUsageBreakdownEntry {
  key: string
  amount_usd: number
  // Only populated when group_by=department — mock-only enhancement for
  // the Dashboard's "Top Tool" column; not in the API design doc.
  top_vendor?: string
}

export interface OrgUsage {
  total_usd: number
  group_by: OrgUsageGroupBy
  breakdown: OrgUsageBreakdownEntry[]
}

export interface DateRangeParams {
  from?: string
  to?: string
}
