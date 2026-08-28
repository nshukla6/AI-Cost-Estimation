import type { MockCostRecord, MockDb } from '@/mocks/db'
import type {
  DepartmentUsage,
  MyUsage,
  OrgUsage,
  OrgUsageBreakdownEntry,
  OrgUsageGroupBy,
  TeamUsage,
  TeamUsageEntry,
} from '@/types/domain'

interface RangeFilter {
  from?: string
  to?: string
}

function inRange(costMonth: string, { from, to }: RangeFilter): boolean {
  if (from && costMonth < from) return false
  if (to && costMonth > to) return false
  return true
}

function activeRecordsFor(db: MockDb, filter: RangeFilter): MockCostRecord[] {
  return db.costRecords.filter((record) => !record.deleted && inRange(record.cost_month, filter))
}

function round2(amount: number): number {
  return Math.round(amount * 100) / 100
}

function vendorBreakdown(db: MockDb, records: MockCostRecord[]): OrgUsageBreakdownEntry[] {
  const byVendor = new Map<string, number>()
  for (const record of records) {
    byVendor.set(record.vendor, (byVendor.get(record.vendor) ?? 0) + record.amount_usd)
  }
  return Array.from(byVendor.entries())
    .map(([vendorCode, amount]) => ({
      key: db.vendors.find((vendor) => vendor.code === vendorCode)?.name ?? vendorCode,
      amount_usd: round2(amount),
    }))
    .sort((a, b) => b.amount_usd - a.amount_usd)
}

export function computeMyUsage(db: MockDb, userEmail: string, filter: RangeFilter): MyUsage {
  const records = activeRecordsFor(db, filter).filter((record) => record.user_email === userEmail)

  const breakdown = records.map((record) => ({
    vendor: db.vendors.find((vendor) => vendor.code === record.vendor)?.name ?? record.vendor,
    cost_month: record.cost_month,
    amount_usd: record.amount_usd,
  }))

  return {
    user_email: userEmail,
    total_usd: round2(records.reduce((sum, record) => sum + record.amount_usd, 0)),
    breakdown,
  }
}

export function computeTeamUsage(db: MockDb, managerEmail: string, filter: RangeFilter): TeamUsage {
  const reportEmails = new Set(db.users.filter((user) => user.manager_email === managerEmail).map((user) => user.email))
  const records = activeRecordsFor(db, filter).filter((record) => reportEmails.has(record.user_email))

  const byUser = new Map<string, number>()
  for (const record of records) {
    byUser.set(record.user_email, (byUser.get(record.user_email) ?? 0) + record.amount_usd)
  }

  const by_user: TeamUsageEntry[] = Array.from(byUser.entries()).map(([userEmail, amount]) => ({
    user_email: userEmail,
    user_name: db.users.find((user) => user.email === userEmail)?.name ?? userEmail,
    amount_usd: round2(amount),
  }))

  return {
    manager_email: managerEmail,
    total_usd: round2(by_user.reduce((sum, entry) => sum + entry.amount_usd, 0)),
    by_user,
  }
}

export function computeDepartmentUsage(db: MockDb, departmentId: string, filter: RangeFilter): DepartmentUsage {
  const department = db.departments.find((d) => d.id === departmentId)
  const memberEmails = new Set(db.users.filter((user) => user.department_id === departmentId).map((user) => user.email))
  const records = activeRecordsFor(db, filter).filter((record) => memberEmails.has(record.user_email))

  const byUser = new Map<string, number>()
  for (const record of records) {
    byUser.set(record.user_email, (byUser.get(record.user_email) ?? 0) + record.amount_usd)
  }

  const by_user: TeamUsageEntry[] = Array.from(byUser.entries()).map(([userEmail, amount]) => ({
    user_email: userEmail,
    user_name: db.users.find((user) => user.email === userEmail)?.name ?? userEmail,
    amount_usd: round2(amount),
  }))

  return {
    department_id: departmentId,
    department_name: department?.name ?? departmentId,
    total_usd: round2(by_user.reduce((sum, entry) => sum + entry.amount_usd, 0)),
    by_user,
    by_vendor: vendorBreakdown(db, records),
  }
}

export function computeOrgUsage(db: MockDb, filter: RangeFilter & { groupBy: OrgUsageGroupBy }): OrgUsage {
  const records = activeRecordsFor(db, filter)
  const grouped = new Map<string, number>()
  // Only populated for groupBy === 'department', to derive each
  // department's top_vendor (Dashboard's "Top Tool" column).
  const recordsByGroupKey = new Map<string, MockCostRecord[]>()

  for (const record of records) {
    let key: string
    if (filter.groupBy === 'vendor') {
      key = db.vendors.find((vendor) => vendor.code === record.vendor)?.name ?? record.vendor
    } else if (filter.groupBy === 'user') {
      key = db.users.find((user) => user.email === record.user_email)?.name ?? record.user_email
    } else if (filter.groupBy === 'org') {
      key = 'Organization'
    } else {
      const user = db.users.find((u) => u.email === record.user_email)
      const department = user ? db.departments.find((d) => d.id === user.department_id) : undefined
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
      top_vendor: filter.groupBy === 'department' ? vendorBreakdown(db, recordsByGroupKey.get(key) ?? [])[0]?.key : undefined,
    }))
    .sort((a, b) => b.amount_usd - a.amount_usd)

  return {
    total_usd: round2(records.reduce((sum, record) => sum + record.amount_usd, 0)),
    group_by: filter.groupBy,
    breakdown,
  }
}

const CSV_HEADER_LABEL: Record<OrgUsageGroupBy, string> = {
  department: 'department',
  vendor: 'vendor',
  user: 'user',
  org: 'organization',
}

export function generateOrgReportCsv(db: MockDb, filter: RangeFilter & { groupBy: OrgUsageGroupBy }): string {
  const usage = computeOrgUsage(db, filter)
  const header = `${CSV_HEADER_LABEL[filter.groupBy]},amount_usd\n`
  const rows = usage.breakdown.map((entry) => `${entry.key},${entry.amount_usd.toFixed(2)}`).join('\n')
  return header + rows + '\n'
}
