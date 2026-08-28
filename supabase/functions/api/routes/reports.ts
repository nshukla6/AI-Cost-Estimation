import { Hono } from 'npm:hono@4'

import { authenticate, requirePermission } from '../lib/auth-middleware.ts'
import { generateOrgReportCsv, type OrgUsageGroupBy } from '../lib/allocation.ts'

export const reportRoutes = new Hono()

reportRoutes.get('/reports/org/export', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'reports.download', 'Only AI Cost Managers can download reports')

  const groupBy = (c.req.query('group_by') as OrgUsageGroupBy | undefined) ?? 'department'
  const format = c.req.query('format') ?? 'csv'
  const csv = await generateOrgReportCsv({ from: c.req.query('from'), to: c.req.query('to'), groupBy })

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="ai-cost-report.${format}"`,
    },
  })
})
