import { Hono } from 'npm:hono@4'

import { createToken, TOKEN_TTL_SECONDS, verifyPassword } from '../lib/crypto.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const authRoutes = new Hono()

authRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}) as Record<string, never>)
  const email = body.email?.trim().toLowerCase()
  if (!email || !body.password) throw new ApiError(400, 'email and password are required', 'BAD_REQUEST')

  const supabase = getServiceClient()
  const { data: user } = await supabase.from('users').select('*').ilike('email', email).maybeSingle()
  if (!user) throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS')

  const valid = await verifyPassword(body.password, user.password_hash)
  if (!valid) throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS')

  const secret = Deno.env.get('JWT_SECRET')
  if (!secret) throw new Error('JWT_SECRET is not set')
  const accessToken = await createToken({ id: user.id, role: user.role }, secret)

  const { password_hash: _password_hash, ...publicUser } = user
  return c.json({ access_token: accessToken, expires_in: TOKEN_TTL_SECONDS, user: publicUser })
})
