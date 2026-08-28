import { Hono } from 'npm:hono@4'

import { resolveRoles } from '../lib/access.ts'
import { authenticate, requirePermission } from '../lib/auth-middleware.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const userRoutes = new Hono()

const USER_COLUMNS = 'email, name, department_id, manager_email'

userRoutes.get('/users', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'users.view')

  const supabase = getServiceClient()
  const departmentId = c.req.query('department_id')
  const role = c.req.query('role')
  const managerEmail = c.req.query('manager_email')

  // Filtering by role needs an inner join on user_roles so non-matching
  // users are excluded entirely, not just their embedded role rows.
  let query = role
    ? supabase.from('users').select(`${USER_COLUMNS}, user_roles!inner(role_code)`).eq('user_roles.role_code', role)
    : supabase.from('users').select(`${USER_COLUMNS}, user_roles(role_code)`)
  query = query.order('email')

  if (departmentId) query = query.eq('department_id', departmentId)
  if (managerEmail) query = query.eq('manager_email', managerEmail)

  const { data, error } = await query
  if (error) throw error

  const shaped = (data ?? []).map((row) => {
    const { user_roles, ...rest } = row as typeof row & { user_roles: { role_code: string }[] }
    return { ...rest, roles: user_roles.map((r) => r.role_code) }
  })
  return c.json(shaped)
})

// Available roles, for the role-assignment UI's picker.
userRoutes.get('/roles', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'users.manage_roles')

  const supabase = getServiceClient()
  const { data, error } = await supabase.from('roles').select('role_code, role_name, description').order('role_code')
  if (error) throw error
  return c.json(data)
})

userRoutes.post('/users/:email/roles', async (c) => {
  const authedUser = await authenticate(c)
  requirePermission(authedUser, 'users.manage_roles', 'Only AI Tool Admins can manage user roles')

  const targetEmail = decodeURIComponent(c.req.param('email'))
  const body = await c.req.json<{ role_code?: string }>()
  if (!body.role_code) throw new ApiError(400, 'role_code is required', 'BAD_REQUEST')

  const supabase = getServiceClient()

  const { data: targetUser } = await supabase.from('users').select('email').eq('email', targetEmail).maybeSingle()
  if (!targetUser) throw new ApiError(404, 'User not found', 'NOT_FOUND')

  const { data: role } = await supabase.from('roles').select('role_code').eq('role_code', body.role_code).maybeSingle()
  if (!role) throw new ApiError(404, 'Role not found', 'NOT_FOUND')

  const { error } = await supabase.from('user_roles').insert({ user_email: targetEmail, role_code: body.role_code })
  if (error) {
    if (error.code === '23505') throw new ApiError(409, 'User already has this role', 'ROLE_ALREADY_ASSIGNED')
    throw error
  }

  const roles = await resolveRoles(targetEmail)
  return c.json({ email: targetEmail, roles }, 201)
})

userRoutes.delete('/users/:email/roles/:roleCode', async (c) => {
  const authedUser = await authenticate(c)
  requirePermission(authedUser, 'users.manage_roles', 'Only AI Tool Admins can manage user roles')

  const targetEmail = decodeURIComponent(c.req.param('email'))
  const roleCode = c.req.param('roleCode')

  const supabase = getServiceClient()
  const currentRoles = await resolveRoles(targetEmail)
  if (currentRoles.length === 0) throw new ApiError(404, 'User has no roles', 'NOT_FOUND')
  if (currentRoles.length === 1 && currentRoles[0] === roleCode) {
    throw new ApiError(409, "Cannot remove a user's last role", 'LAST_ROLE')
  }

  const { error } = await supabase.from('user_roles').delete().eq('user_email', targetEmail).eq('role_code', roleCode)
  if (error) throw error

  const roles = await resolveRoles(targetEmail)
  return c.json({ email: targetEmail, roles })
})
