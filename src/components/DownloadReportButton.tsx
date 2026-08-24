import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/components/AuthContext'
import { Button } from '@/components/ui/button'
import { PERMISSIONS } from '@/config/roles.config'
import { downloadOrgReport } from '@/lib/api/reports.api'
import type { OrgUsageGroupBy } from '@/types/domain'

interface DownloadReportButtonProps {
  from: string
  to: string
  groupBy?: OrgUsageGroupBy
}

/**
 * "Every screen has a download report button" — ai_cost_manager only
 * (ai_tool_admin can see all screens but not download). Downloads whatever
 * period the page's own <PeriodFilter> is currently set to.
 */
export function DownloadReportButton({ from, to, groupBy }: DownloadReportButtonProps) {
  const { hasPermission } = useAuth()
  const [isDownloading, setIsDownloading] = useState(false)

  if (!hasPermission(PERMISSIONS.DOWNLOAD_REPORTS)) {
    return null
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadOrgReport({ from, to, groupBy })
    } catch {
      toast.error('Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
      <Download className="size-4" />
      {isDownloading ? 'Downloading...' : 'Download Report'}
    </Button>
  )
}
