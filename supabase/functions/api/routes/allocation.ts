import { Hono } from 'npm:hono@4'

import { authenticate, requireRole } from '../lib/auth-middleware.ts'
import { computeDepartmentUsage, computeMyUsage, computeOrgUsage, computeTeamUsage, type OrgUsageGroupBy } from '../lib/allocation.ts'

export const allocationRoutes = new Hono()

allocationRoutes.get('/allocation/my-usage', async (c) => {
  const user = await authenticate(c)
  const result = await computeMyUsage(user.id, { from: c.req.query('from'), to: c.req.query('to') })
  return c.json(result)
})

allocationRoutes.get('/allocation/team', async (c) => {
  const user = await authenticate(c)
  const result = await computeTeamUsage(user.id, { from: c.req.query('from'), to: c.req.query('to') })
  return c.json(result)
})

allocationRoutes.get('/allocation/department/:departmentId', async (c) => {
  const user = await authenticate(c)
  // The API design doc scopes this to ai_cost_manager only, but ai_tool_admin
  // can "see all the screens" (just not download) — mirrors handlers.ts.
  requireRole(user, ['ai_cost_manager', 'ai_tool_admin'])

  const result = await computeDepartmentUsage(Number(c.req.param('departmentId')), { from: c.req.query('from'), to: c.req.query('to') })
  return c.json(result)
})

allocationRoutes.get('/allocation/org', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_cost_manager', 'ai_tool_admin'])

  const groupBy = (c.req.query('group_by') as OrgUsageGroupBy | undefined) ?? 'department'
  const result = await computeOrgUsage({ from: c.req.query('from'), to: c.req.query('to'), groupBy })
  return c.json(result)
})
