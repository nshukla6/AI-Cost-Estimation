import { Hono } from 'npm:hono@4'

import { authenticate, requirePermission } from '../lib/auth-middleware.ts'
import { computeDepartmentUsage, computeMyUsage, computeOrgUsage, computeTeamUsage, type OrgUsageGroupBy } from '../lib/allocation.ts'

export const allocationRoutes = new Hono()

allocationRoutes.get('/allocation/my-usage', async (c) => {
  const user = await authenticate(c)
  const result = await computeMyUsage(user.email, { from: c.req.query('from'), to: c.req.query('to') })
  return c.json(result)
})

allocationRoutes.get('/allocation/team', async (c) => {
  const user = await authenticate(c)
  const result = await computeTeamUsage(user.email, { from: c.req.query('from'), to: c.req.query('to') })
  return c.json(result)
})

allocationRoutes.get('/allocation/department/:departmentId', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'usage.view_department')

  const result = await computeDepartmentUsage(c.req.param('departmentId'), { from: c.req.query('from'), to: c.req.query('to') })
  return c.json(result)
})

allocationRoutes.get('/allocation/org', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'usage.view_org')

  const groupBy = (c.req.query('group_by') as OrgUsageGroupBy | undefined) ?? 'department'
  const result = await computeOrgUsage({ from: c.req.query('from'), to: c.req.query('to'), groupBy })
  return c.json(result)
})
