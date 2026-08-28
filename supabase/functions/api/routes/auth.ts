import { Hono } from 'npm:hono@4'

import { resolveAccess } from '../lib/access.ts'
import { createToken, TOKEN_TTL_SECONDS, verifyPassword } from '../lib/crypto.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const authRoutes = new Hono()

authRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}) as Record<string, never>)
  const email = body.email?.trim().toLowerCase()
  if (!email || !body.password) throw new ApiError(400, 'email and password are required', 'BAD_REQUEST')

  const supabase = getServiceClient()

  // Password check lives in user_auth, not users — users is directory-shaped
  // (mirrors an HR/IdP sync), not something this app writes credentials to.
  const { data: authRow } = await supabase.from('user_auth').select('user_email, password_hash').ilike('user_email', email).maybeSingle()
  if (!authRow) throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS')

  const valid = await verifyPassword(body.password, authRow.password_hash)
  if (!valid) throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS')

  const { data: user } = await supabase.from('users').select('email, name, department_id, manager_email').eq('email', authRow.user_email).maybeSingle()
  if (!user) throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS')

  const { roles, permissions } = await resolveAccess(user.email)

  const secret = Deno.env.get('JWT_SECRET')
  if (!secret) throw new Error('JWT_SECRET is not set')
  const accessToken = await createToken({ email: user.email }, secret)

  return c.json({ access_token: accessToken, expires_in: TOKEN_TTL_SECONDS, user: { ...user, roles, permissions } })
})
