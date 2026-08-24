import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { PeriodFilter } from '@/components/PeriodFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allocationApi } from '@/lib/api/allocation.api'
import { formatUsd } from '@/lib/format'
import { periodRange, type PeriodGranularity } from '@/lib/period'
import type { TeamUsageEntry } from '@/types/domain'

const columns: DataTableColumn<TeamUsageEntry>[] = [
  { key: 'user_name', header: 'Reportee', render: (row) => row.user_name },
  { key: 'amount_usd', header: 'Spend', align: 'right', render: (row) => formatUsd(row.amount_usd) },
]

/**
 * GET /allocation/team is available to any user with direct reports,
 * independent of role — a viewer who manages people still sees this.
 */
export function Team() {
  const [granularity, setGranularity] = useState<PeriodGranularity>('month')
  const { from, to, label } = periodRange(granularity)

  const teamUsageQuery = useQuery({ queryKey: ['allocation', 'team', { from, to }], queryFn: () => allocationApi.getTeamUsage({ from, to }) })
  const reportees = teamUsageQuery.data?.by_user ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Team</h1>
          <p className="text-sm text-muted-foreground">AI spend for people reporting to you — {label}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={granularity} onChange={setGranularity} />
          <DownloadReportButton from={from} to={to} />
        </div>
      </div>

      <Card className="max-w-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Team Total Spend</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{teamUsageQuery.data ? formatUsd(teamUsageQuery.data.total_usd) : '—'}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by Reportee</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={reportees}
            rowKey={(row) => row.user_id}
            isLoading={teamUsageQuery.isLoading}
            emptyMessage="You have no direct reports."
          />
        </CardContent>
      </Card>
    </div>
  )
}
