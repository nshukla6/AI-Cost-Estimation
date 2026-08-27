import type { Context } from 'npm:hono@4'

import { verifyToken } from './crypto.ts'
import { ApiError } from './errors.ts'
import { getServiceClient } from './supabase.ts'

export interface AuthedUser {
  id: number
  name: string
  email: string
  role: string
  department_id: number
  manager_id: number | null
}

/** Mirrors "every endpoint except login requires Authorization: Bearer <token>". */
export async function authenticate(c: Context): Promise<AuthedUser> {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Missing or expired token', 'AUTH_REQUIRED')

  const secret = Deno.env.get('JWT_SECRET')
  if (!secret) throw new Error('JWT_SECRET is not set')

  const payload = await verifyToken(header.slice('Bearer '.length), secret)
  if (!payload) throw new ApiError(401, 'Missing or expired token', 'AUTH_REQUIRED')

  const supabase = getServiceClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, department_id, manager_id')
    .eq('id', payload.sub)
    .maybeSingle()

  if (error || !user) throw new ApiError(401, 'Missing or expired token', 'AUTH_REQUIRED')
  return user as AuthedUser
}

export function requireRole(user: AuthedUser, roles: string[], message = 'You do not have permission to perform this action'): void {
  if (!roles.includes(user.role)) throw new ApiError(403, message, 'FORBIDDEN')
}
