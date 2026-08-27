import { Hono } from 'npm:hono@4'

import { authenticate, requireRole } from '../lib/auth-middleware.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const userRoutes = new Hono()

const PUBLIC_USER_COLUMNS = 'id, name, email, role, department_id, manager_id'

userRoutes.get('/users', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_tool_admin', 'ai_cost_manager'])

  const supabase = getServiceClient()
  let query = supabase.from('users').select(PUBLIC_USER_COLUMNS).order('id')

  const departmentId = c.req.query('department_id')
  const role = c.req.query('role')
  const managerId = c.req.query('manager_id')
  if (departmentId) query = query.eq('department_id', Number(departmentId))
  if (role) query = query.eq('role', role)
  if (managerId) query = query.eq('manager_id', Number(managerId))

  const { data, error } = await query
  if (error) throw error
  return c.json(data)
})

userRoutes.put('/users/:id/role', async (c) => {
  const authedUser = await authenticate(c)
  requireRole(authedUser, ['ai_tool_admin'], 'Only AI Tool Admins can change user roles')

  const body = await c.req.json<{ role: string }>()
  if (body.role !== 'viewer') {
    throw new ApiError(403, 'AI Tool Admins can only set a user’s role to viewer', 'FORBIDDEN')
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('users')
    .update({ role: body.role })
    .eq('id', Number(c.req.param('id')))
    .select(PUBLIC_USER_COLUMNS)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ApiError(404, 'User not found', 'NOT_FOUND')
  return c.json(data)
})
