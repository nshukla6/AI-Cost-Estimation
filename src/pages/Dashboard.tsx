import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, DollarSign, KeySquare } from 'lucide-react'

import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { BarSpendChart } from '@/components/generic/charts/BarSpendChart'
import { PieSpendChart } from '@/components/generic/charts/PieSpendChart'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { PeriodFilter } from '@/components/PeriodFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allocationApi } from '@/lib/api/allocation.api'
import { getVendorColor } from '@/lib/chartColors'
import { DEPARTMENTS } from '@/lib/departments'
import { formatUsd } from '@/lib/format'
import { periodRange, type PeriodGranularity } from '@/lib/period'
import { usersApi } from '@/lib/api/users.api'
import { vendorsApi } from '@/lib/api/vendors.api'
import type { OrgUsageBreakdownEntry } from '@/types/domain'

const columns: DataTableColumn<OrgUsageBreakdownEntry>[] = [
  { key: 'key', header: 'Department', render: (row) => row.key },
  { key: 'amount_usd', header: 'Spend', align: 'right', render: (row) => formatUsd(row.amount_usd) },
  { key: 'top_tool', header: 'Top Tool', render: (row) => row.top_vendor ?? <span className="text-muted-foreground">—</span> },
]

export function Dashboard() {
  const [granularity, setGranularity] = useState<PeriodGranularity>('month')
  const { from, to, label } = periodRange(granularity)

  const orgByDepartmentQuery = useQuery({
    queryKey: ['allocation', 'org', { groupBy: 'department', from, to }],
    queryFn: () => allocationApi.getOrgUsage({ groupBy: 'department', from, to }),
  })
  const orgByVendorQuery = useQuery({
    queryKey: ['allocation', 'org', { groupBy: 'vendor', from, to }],
    queryFn: () => allocationApi.getOrgUsage({ groupBy: 'vendor', from, to }),
  })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() })
  const vendorsQuery = useQuery({ queryKey: ['vendors'], queryFn: () => vendorsApi.getAll() })

  const totalSpend = orgByDepartmentQuery.data?.total_usd ?? 0
  const activeLicenses = usersQuery.data?.length ?? 0
  const activeVendors = vendorsQuery.data?.filter((vendor) => vendor.is_active).length ?? 0

  const departmentBarData = (orgByDepartmentQuery.data?.breakdown ?? []).map((entry) => ({ name: entry.key, value: entry.amount_usd }))
  const vendorPieData = (orgByVendorQuery.data?.breakdown ?? []).map((entry) => ({ name: entry.key, value: entry.amount_usd, color: getVendorColor(entry.key) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Organisation-wide AI spend across all departments — {label}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={granularity} onChange={setGranularity} />
          <DownloadReportButton from={from} to={to} groupBy="department" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatUsd(totalSpend)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Licenses</CardTitle>
            <KeySquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {activeLicenses} <span className="text-sm font-normal text-muted-foreground">users &middot; {activeVendors} vendors</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{DEPARTMENTS.length}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {orgByDepartmentQuery.isLoading ? <div className="h-[240px] animate-pulse rounded-md bg-muted" /> : <BarSpendChart data={departmentBarData} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spend by AI Tool</CardTitle>
          </CardHeader>
          <CardContent>
            {orgByVendorQuery.isLoading ? <div className="h-[240px] animate-pulse rounded-md bg-muted" /> : <PieSpendChart data={vendorPieData} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spend by Department (table)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={orgByDepartmentQuery.data?.breakdown ?? []} rowKey={(row) => row.key} isLoading={orgByDepartmentQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
