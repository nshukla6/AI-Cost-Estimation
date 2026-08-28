import { Hono } from 'npm:hono@4'

import { authenticate, requirePermission } from '../lib/auth-middleware.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const vendorRoutes = new Hono()

vendorRoutes.get('/vendors', async (c) => {
  await authenticate(c)

  const supabase = getServiceClient()
  const isActiveParam = c.req.query('is_active')
  let query = supabase.from('vendors').select('code, name, is_active').order('code')
  if (isActiveParam !== undefined) query = query.eq('is_active', isActiveParam === 'true')

  const { data, error } = await query
  if (error) throw error
  return c.json(data)
})

vendorRoutes.put('/vendors/:code', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'vendors.manage', 'Only AI Tool Admins can manage vendors')

  const body = await c.req.json<{ is_active: boolean }>()
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('vendors')
    .update({ is_active: body.is_active })
    .eq('code', c.req.param('code'))
    .select('code, name, is_active')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ApiError(404, 'Vendor not found', 'NOT_FOUND')
  return c.json(data)
})
