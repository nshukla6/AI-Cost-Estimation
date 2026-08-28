// Direct port of src/mocks/allocation.ts, reading from Postgres instead of
// the in-memory mock db. Reference tables (vendors/departments/users) are
// small, so they're loaded whole and joined in JS — same shape as the mock,
// which keeps this easy to diff against if the mock and this ever drift.
import { getServiceClient } from './supabase.ts'

interface RangeFilter {
  from?: string
  to?: string
}

type CostRecordRow = { user_email: string; vendor: string; cost_month: string; amount_usd: number }

function round2(amount: number): number {
  return Math.round(amount * 100) / 100
}

async function loadReferenceData() {
  const supabase = getServiceClient()
  const [{ data: vendors }, { data: departments }, { data: users }] = await Promise.all([
    supabase.from('vendors').select('code, name'),
    supabase.from('departments').select('department_id, department_name'),
    supabase.from('users').select('email, name, department_id, manager_email'),
  ])
  return { vendors: vendors ?? [], departments: departments ?? [], users: users ?? [] }
}

async function activeRecords(filter: RangeFilter, userEmailFilter?: string[]): Promise<CostRecordRow[]> {
  if (userEmailFilter && userEmailFilter.length === 0) return []

  const supabase = getServiceClient()
  let query = supabase.from('cost_records').select('user_email, vendor, cost_month, amount_usd').eq('is_deleted', false)
  if (filter.from) query = query.gte('cost_month', filter.from)
  if (filter.to) query = query.lte('cost_month', filter.to)
  if (userEmailFilter) query = query.in('user_email', userEmailFilter)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

function vendorBreakdown(vendors: { code: string; name: string }[], records: CostRecordRow[]) {
  const byVendor = new Map<string, number>()
  for (const record of records) byVendor.set(record.vendor, (byVendor.get(record.vendor) ?? 0) + record.amount_usd)
  return Array.from(byVendor.entries())
    .map(([vendorCode, amount]) => ({ key: vendors.find((v) => v.code === vendorCode)?.name ?? vendorCode, amount_usd: round2(amount) }))
    .sort((a, b) => b.amount_usd - a.amount_usd)
}

export async function computeMyUsage(userEmail: string, filter: RangeFilter) {
  const { vendors } = await loadReferenceData()
  const records = await activeRecords(filter, [userEmail])

  const breakdown = records.map((r) => ({
    vendor: vendors.find((v) => v.code === r.vendor)?.name ?? r.vendor,
    cost_month: r.cost_month,
    amount_usd: r.amount_usd,
  }))

  return { user_email: userEmail, total_usd: round2(records.reduce((sum, r) => sum + r.amount_usd, 0)), breakdown }
}

export async function computeTeamUsage(managerEmail: string, filter: RangeFilter) {
  const { users } = await loadReferenceData()
  const reportEmails = users.filter((u) => u.manager_email === managerEmail).map((u) => u.email)
  const records = await activeRecords(filter, reportEmails)

  const byUser = new Map<string, number>()
  for (const r of records) byUser.set(r.user_email, (byUser.get(r.user_email) ?? 0) + r.amount_usd)
  const by_user = Array.from(byUser.entries()).map(([userEmail, amount]) => ({
    user_email: userEmail,
    user_name: users.find((u) => u.email === userEmail)?.name ?? userEmail,
    amount_usd: round2(amount),
  }))

  return { manager_email: managerEmail, total_usd: round2(by_user.reduce((sum, e) => sum + e.amount_usd, 0)), by_user }
}

export async function computeDepartmentUsage(departmentId: string, filter: RangeFilter) {
  const { vendors, departments, users } = await loadReferenceData()
  const department = departments.find((d) => d.department_id === departmentId)
  const memberEmails = users.filter((u) => u.department_id === departmentId).map((u) => u.email)
  const records = await activeRecords(filter, memberEmails)

  const byUser = new Map<string, number>()
  for (const r of records) byUser.set(r.user_email, (byUser.get(r.user_email) ?? 0) + r.amount_usd)
  const by_user = Array.from(byUser.entries()).map(([userEmail, amount]) => ({
    user_email: userEmail,
    user_name: users.find((u) => u.email === userEmail)?.name ?? userEmail,
    amount_usd: round2(amount),
  }))

  return {
    department_id: departmentId,
    department_name: department?.department_name ?? departmentId,
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
      key = vendors.find((v) => v.code === record.vendor)?.name ?? record.vendor
    } else if (filter.groupBy === 'user') {
      key = users.find((u) => u.email === record.user_email)?.name ?? record.user_email
    } else if (filter.groupBy === 'org') {
      key = 'Organization'
    } else {
      const user = users.find((u) => u.email === record.user_email)
      const department = user ? departments.find((d) => d.department_id === user.department_id) : undefined
      key = department?.department_name ?? 'Unknown'
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
