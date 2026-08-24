import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/components/AuthContext'
import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { LineTrendChart } from '@/components/generic/charts/LineTrendChart'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { PeriodFilter } from '@/components/PeriodFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allocationApi } from '@/lib/api/allocation.api'
import { formatUsd } from '@/lib/format'
import { lastNMonths, periodRange, type PeriodGranularity } from '@/lib/period'
import type { MyUsageBreakdownEntry } from '@/types/domain'

const columns: DataTableColumn<MyUsageBreakdownEntry>[] = [
  { key: 'vendor', header: 'AI Tool', render: (row) => row.vendor },
  { key: 'cost_month', header: 'Month', render: (row) => row.cost_month },
  { key: 'amount_usd', header: 'Spend', align: 'right', render: (row) => formatUsd(row.amount_usd) },
]

const trendMonths = lastNMonths(6)

export function MyUsage() {
  const { currentUser } = useAuth()
  const [granularity, setGranularity] = useState<PeriodGranularity>('month')
  const { from, to, label } = periodRange(granularity)

  const myUsageQuery = useQuery({ queryKey: ['allocation', 'my-usage', { from, to }], queryFn: () => allocationApi.getMyUsage({ from, to }) })
  const trendQueries = useQueries({
    queries: trendMonths.map((month) => ({
      queryKey: ['allocation', 'my-usage', 'trend', month.from],
      queryFn: () => allocationApi.getMyUsage({ from: month.from, to: month.to }),
    })),
  })
  const trendData = trendMonths.map((month, index) => ({ name: month.shortLabel, value: trendQueries[index].data?.total_usd ?? 0 }))
  const trendLoading = trendQueries.some((query) => query.isLoading)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Usage</h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.name}'s AI spend across all tools — {label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={granularity} onChange={setGranularity} />
          <DownloadReportButton from={from} to={to} />
        </div>
      </div>

      <Card className="max-w-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{myUsageQuery.data ? formatUsd(myUsageQuery.data.total_usd) : '—'}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? <div className="h-[240px] animate-pulse rounded-md bg-muted" /> : <LineTrendChart data={trendData} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={myUsageQuery.data?.breakdown ?? []}
            rowKey={(row) => `${row.vendor}-${row.cost_month}`}
            isLoading={myUsageQuery.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
