import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { PeriodFilter } from '@/components/PeriodFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allocationApi } from '@/lib/api/allocation.api'
import { DEPARTMENTS } from '@/lib/departments'
import { formatUsd } from '@/lib/format'
import { periodRange, type PeriodGranularity } from '@/lib/period'
import type { OrgUsageBreakdownEntry, TeamUsageEntry } from '@/types/domain'

const userColumns: DataTableColumn<TeamUsageEntry>[] = [
  { key: 'user_name', header: 'User', render: (row) => row.user_name },
  { key: 'amount_usd', header: 'Spend', align: 'right', render: (row) => formatUsd(row.amount_usd) },
]

const vendorColumns: DataTableColumn<OrgUsageBreakdownEntry>[] = [
  { key: 'key', header: 'AI Tool', render: (row) => row.key },
  { key: 'amount_usd', header: 'Spend', align: 'right', render: (row) => formatUsd(row.amount_usd) },
]

export function DepartmentDetail() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const id = Number(departmentId)
  const knownDepartment = DEPARTMENTS.find((department) => department.id === id)

  const [granularity, setGranularity] = useState<PeriodGranularity>('month')
  const { from, to, label } = periodRange(granularity)

  const departmentQuery = useQuery({
    queryKey: ['allocation', 'department', id, { from, to }],
    queryFn: () => allocationApi.getDepartmentUsage(id, { from, to }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{knownDepartment?.name ?? departmentQuery.data?.department_name ?? 'Department'}</h1>
          <p className="text-sm text-muted-foreground">Per-user spend and AI tool breakdown — {label}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={granularity} onChange={setGranularity} />
          <DownloadReportButton from={from} to={to} groupBy="department" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by User</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={userColumns}
              data={departmentQuery.data?.by_user ?? []}
              rowKey={(row) => row.user_id}
              isLoading={departmentQuery.isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by AI Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">Total: {departmentQuery.data ? formatUsd(departmentQuery.data.total_usd) : '—'}</p>
            <DataTable
              columns={vendorColumns}
              data={departmentQuery.data?.by_vendor ?? []}
              rowKey={(row) => row.key}
              isLoading={departmentQuery.isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
