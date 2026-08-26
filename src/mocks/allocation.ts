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
  const byVendor = new Map<number, number>()
  for (const record of records) {
    byVendor.set(record.vendor_id, (byVendor.get(record.vendor_id) ?? 0) + record.amount_usd)
  }
  return Array.from(byVendor.entries())
    .map(([vendorId, amount]) => ({
      key: db.vendors.find((vendor) => vendor.id === vendorId)?.name ?? `Vendor #${vendorId}`,
      amount_usd: round2(amount),
    }))
    .sort((a, b) => b.amount_usd - a.amount_usd)
}

export function computeMyUsage(db: MockDb, userId: number, filter: RangeFilter): MyUsage {
  const records = activeRecordsFor(db, filter).filter((record) => record.user_id === userId)

  const breakdown = records.map((record) => ({
    vendor: db.vendors.find((vendor) => vendor.id === record.vendor_id)?.name ?? `Vendor #${record.vendor_id}`,
    cost_month: record.cost_month,
    amount_usd: record.amount_usd,
  }))

  return {
    user_id: userId,
    total_usd: round2(records.reduce((sum, record) => sum + record.amount_usd, 0)),
    breakdown,
  }
}

export function computeTeamUsage(db: MockDb, managerId: number, filter: RangeFilter): TeamUsage {
  const reportIds = new Set(db.users.filter((user) => user.manager_id === managerId).map((user) => user.id))
  const records = activeRecordsFor(db, filter).filter((record) => reportIds.has(record.user_id))

  const byUser = new Map<number, number>()
  for (const record of records) {
    byUser.set(record.user_id, (byUser.get(record.user_id) ?? 0) + record.amount_usd)
  }

  const by_user: TeamUsageEntry[] = Array.from(byUser.entries()).map(([userId, amount]) => ({
    user_id: userId,
    user_name: db.users.find((user) => user.id === userId)?.name ?? `User #${userId}`,
    amount_usd: round2(amount),
  }))

  return {
    manager_id: managerId,
    total_usd: round2(by_user.reduce((sum, entry) => sum + entry.amount_usd, 0)),
    by_user,
  }
}

export function computeDepartmentUsage(db: MockDb, departmentId: number, filter: RangeFilter): DepartmentUsage {
  const department = db.departments.find((d) => d.id === departmentId)
  const memberIds = new Set(db.users.filter((user) => user.department_id === departmentId).map((user) => user.id))
  const records = activeRecordsFor(db, filter).filter((record) => memberIds.has(record.user_id))

  const byUser = new Map<number, number>()
  for (const record of records) {
    byUser.set(record.user_id, (byUser.get(record.user_id) ?? 0) + record.amount_usd)
  }

  const by_user: TeamUsageEntry[] = Array.from(byUser.entries()).map(([userId, amount]) => ({
    user_id: userId,
    user_name: db.users.find((user) => user.id === userId)?.name ?? `User #${userId}`,
    amount_usd: round2(amount),
  }))

  return {
    department_id: departmentId,
    department_name: department?.name ?? `Department #${departmentId}`,
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
      key = db.vendors.find((vendor) => vendor.id === record.vendor_id)?.name ?? `Vendor #${record.vendor_id}`
    } else if (filter.groupBy === 'user') {
      key = db.users.find((user) => user.id === record.user_id)?.name ?? `User #${record.user_id}`
    } else if (filter.groupBy === 'org') {
      key = 'Organization'
    } else {
      const user = db.users.find((u) => u.id === record.user_id)
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
