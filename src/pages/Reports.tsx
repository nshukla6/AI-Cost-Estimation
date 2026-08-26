import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { downloadOrgReport } from '@/lib/api/reports.api'
import { periodRange } from '@/lib/period'
import type { OrgUsageGroupBy } from '@/types/domain'

const REPORT_BASIS_OPTIONS: { value: OrgUsageGroupBy; label: string; description: string }[] = [
  { value: 'org', label: 'Organization', description: 'Total spend across the whole org, no breakdown.' },
  { value: 'department', label: 'Department', description: 'Spend broken down by department.' },
  { value: 'vendor', label: 'Vendor', description: 'Spend broken down by AI tool / vendor.' },
  { value: 'user', label: 'User', description: 'Spend broken down by individual user.' },
]

const defaultRange = periodRange('month')

/**
 * Standalone reporting screen — ai_cost_manager only (DOWNLOAD_REPORTS).
 * Wraps the same GET /reports/org/export endpoint the per-page "Download
 * Report" buttons use, but lets the date range and basis be picked freely
 * instead of following whatever period a specific page is currently on.
 */
export function Reports() {
  const [basis, setBasis] = useState<OrgUsageGroupBy>('org')
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [isDownloading, setIsDownloading] = useState(false)

  const rangeInvalid = Boolean(from && to && from > to)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadOrgReport({ from: from || undefined, to: to || undefined, groupBy: basis })
    } catch {
      toast.error('Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Download AI spend reports by organization, department, vendor, or user.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="report-basis">Report by</Label>
            <Select value={basis} onValueChange={(next) => setBasis(next as OrgUsageGroupBy)}>
              <SelectTrigger id="report-basis" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_BASIS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{REPORT_BASIS_OPTIONS.find((option) => option.value === basis)?.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
            </div>
          </div>
          {rangeInvalid && <p className="text-xs text-destructive">"From" date must be on or before "To" date.</p>}

          <Button onClick={handleDownload} disabled={isDownloading || rangeInvalid}>
            <Download className="size-4" />
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
