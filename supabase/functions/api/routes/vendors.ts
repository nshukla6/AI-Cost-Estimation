import { Hono } from 'npm:hono@4'

import { authenticate, requireRole } from '../lib/auth-middleware.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const vendorRoutes = new Hono()

vendorRoutes.get('/vendors', async (c) => {
  await authenticate(c)

  const supabase = getServiceClient()
  const isActiveParam = c.req.query('is_active')
  let query = supabase.from('vendors').select('id, name, is_active').order('id')
  if (isActiveParam !== undefined) query = query.eq('is_active', isActiveParam === 'true')

  const { data, error } = await query
  if (error) throw error
  return c.json(data)
})

vendorRoutes.put('/vendors/:id', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_tool_admin'], 'Only AI Tool Admins can manage vendors')

  const body = await c.req.json<{ is_active: boolean }>()
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('vendors')
    .update({ is_active: body.is_active })
    .eq('id', Number(c.req.param('id')))
    .select('id, name, is_active')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ApiError(404, 'Vendor not found', 'NOT_FOUND')
  return c.json(data)
})
