// Direct port of src/mocks/allocation.ts, reading from Postgres instead of
// the in-memory mock db. Reference tables (vendors/departments/users) are
// small, so they're loaded whole and joined in JS — same shape as the mock,
// which keeps this easy to diff against if the mock and this ever drift.
import { getServiceClient } from './supabase.ts'

interface RangeFilter {
  from?: string
  to?: string
}

type CostRecordRow = { user_id: number; vendor_id: number; cost_month: string; amount_usd: number }

function round2(amount: number): number {
  return Math.round(amount * 100) / 100
}

async function loadReferenceData() {
  const supabase = getServiceClient()
  const [{ data: vendors }, { data: departments }, { data: users }] = await Promise.all([
    supabase.from('vendors').select('id, name'),
    supabase.from('departments').select('id, name'),
    supabase.from('users').select('id, name, department_id, manager_id'),
  ])
  return { vendors: vendors ?? [], departments: departments ?? [], users: users ?? [] }
}

async function activeRecords(filter: RangeFilter, userIdFilter?: number[]): Promise<CostRecordRow[]> {
  if (userIdFilter && userIdFilter.length === 0) return []

  const supabase = getServiceClient()
  let query = supabase.from('cost_records').select('user_id, vendor_id, cost_month, amount_usd').eq('is_deleted', false)
  if (filter.from) query = query.gte('cost_month', filter.from)
  if (filter.to) query = query.lte('cost_month', filter.to)
  if (userIdFilter) query = query.in('user_id', userIdFilter)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

function vendorBreakdown(vendors: { id: number; name: string }[], records: CostRecordRow[]) {
  const byVendor = new Map<number, number>()
  for (const record of records) byVendor.set(record.vendor_id, (byVendor.get(record.vendor_id) ?? 0) + record.amount_usd)
  return Array.from(byVendor.entries())
    .map(([vendorId, amount]) => ({ key: vendors.find((v) => v.id === vendorId)?.name ?? `Vendor #${vendorId}`, amount_usd: round2(amount) }))
    .sort((a, b) => b.amount_usd - a.amount_usd)
}

export async function computeMyUsage(userId: number, filter: RangeFilter) {
  const { vendors } = await loadReferenceData()
  const records = await activeRecords(filter, [userId])

  const breakdown = records.map((r) => ({
    vendor: vendors.find((v) => v.id === r.vendor_id)?.name ?? `Vendor #${r.vendor_id}`,
    cost_month: r.cost_month,
    amount_usd: r.amount_usd,
  }))

  return { user_id: userId, total_usd: round2(records.reduce((sum, r) => sum + r.amount_usd, 0)), breakdown }
}

export async function computeTeamUsage(managerId: number, filter: RangeFilter) {
  const { users } = await loadReferenceData()
  const reportIds = users.filter((u) => u.manager_id === managerId).map((u) => u.id)
  const records = await activeRecords(filter, reportIds)

  const byUser = new Map<number, number>()
  for (const r of records) byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + r.amount_usd)
  const by_user = Array.from(byUser.entries()).map(([userId, amount]) => ({
    user_id: userId,
    user_name: users.find((u) => u.id === userId)?.name ?? `User #${userId}`,
    amount_usd: round2(amount),
  }))

  return { manager_id: managerId, total_usd: round2(by_user.reduce((sum, e) => sum + e.amount_usd, 0)), by_user }
}

export async function computeDepartmentUsage(departmentId: number, filter: RangeFilter) {
  const { vendors, departments, users } = await loadReferenceData()
  const department = departments.find((d) => d.id === departmentId)
  const memberIds = users.filter((u) => u.department_id === departmentId).map((u) => u.id)
  const records = await activeRecords(filter, memberIds)

  const byUser = new Map<number, number>()
  for (const r of records) byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + r.amount_usd)
  const by_user = Array.from(byUser.entries()).map(([userId, amount]) => ({
    user_id: userId,
    user_name: users.find((u) => u.id === userId)?.name ?? `User #${userId}`,
    amount_usd: round2(amount),
  }))

  return {
    department_id: departmentId,
    department_name: department?.name ?? `Department #${departmentId}`,
    total_usd: round2(by_user.reduce((sum, e) => sum + e.amount_usd, 0)),
    by_user,
    by_vendor: vendorBreakdown(vendors, records),
  }
}

export type OrgUsageGroupBy = 'department' | 'vendor' | 'user' | 'org'

export async function computeOrgUsage(filter: RangeFilter & { groupBy: OrgUsageGroupBy }) {
  const { vendors, departments, users } = await loadReferenceData()
  const records = await activeRecords(filter)

  const grouped = new Map<string, number>()
  const recordsByGroupKey = new Map<string, CostRecordRow[]>()

  for (const record of records) {
    let key: string
    if (filter.groupBy === 'vendor') {
      key = vendors.find((v) => v.id === record.vendor_id)?.name ?? `Vendor #${record.vendor_id}`
    } else if (filter.groupBy === 'user') {
      key = users.find((u) => u.id === record.user_id)?.name ?? `User #${record.user_id}`
    } else if (filter.groupBy === 'org') {
      key = 'Organization'
    } else {
      const user = users.find((u) => u.id === record.user_id)
      const department = user ? departments.find((d) => d.id === user.department_id) : undefined
      key = department?.name ?? 'Unknown'
    }
    grouped.set(key, (grouped.get(key) ?? 0) + record.amount_usd)

    if (filter.groupBy === 'department') {
      const bucket = recordsByGroupKey.get(key) ?? []
      bucket.push(record)
      recordsByGroupKey.set(key, bucket)
    }
  }

  const breakdown = Array.from(grouped.entries())
    .map(([key, amount]) => ({
      key,
      amount_usd: round2(amount),
      top_vendor: filter.groupBy === 'department' ? vendorBreakdown(vendors, recordsByGroupKey.get(key) ?? [])[0]?.key : undefined,
    }))
    .sort((a, b) => b.amount_usd - a.amount_usd)

  return { total_usd: round2(records.reduce((sum, r) => sum + r.amount_usd, 0)), group_by: filter.groupBy, breakdown }
}

const CSV_HEADER_LABEL: Record<OrgUsageGroupBy, string> = { department: 'department', vendor: 'vendor', user: 'user', org: 'organization' }

export async function generateOrgReportCsv(filter: RangeFilter & { groupBy: OrgUsageGroupBy }): Promise<string> {
  const usage = await computeOrgUsage(filter)
  const header = `${CSV_HEADER_LABEL[filter.groupBy]},amount_usd\n`
  const rows = usage.breakdown.map((e) => `${e.key},${e.amount_usd.toFixed(2)}`).join('\n')
  return header + rows + '\n'
}
