import { appConfig } from '@/config/app.config'
import { ApiError, buildQueryString } from '@/lib/api/config'
import type { DateRangeParams, OrgUsageGroupBy } from '@/types/domain'

export interface ExportReportParams extends DateRangeParams {
  groupBy?: OrgUsageGroupBy
  format?: 'csv' | 'pdf'
}

/**
 * GET /reports/org/export returns a binary file stream, so it can't go
 * through the JSON apiRequest client — this downloads it directly.
 */
export async function downloadOrgReport({ from, to, groupBy, format = 'csv' }: ExportReportParams): Promise<void> {
  const token = localStorage.getItem(appConfig.auth.tokenStorageKey)
  const query = buildQueryString({ from, to, group_by: groupBy, format })

  const response = await fetch(`${appConfig.apiBaseUrl}/reports/org/export${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!response.ok) {
    throw new ApiError('Failed to download report', response.status)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') ?? ''
  const fileNameMatch = /filename="?([^";]+)"?/i.exec(disposition)
  const fileName = fileNameMatch?.[1] ?? `ai-cost-report.${format}`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
