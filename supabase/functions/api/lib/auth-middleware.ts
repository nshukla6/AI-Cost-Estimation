import type { Context } from 'npm:hono@4'

import { resolveAccess } from './access.ts'
import { verifyToken } from './crypto.ts'
import { ApiError } from './errors.ts'
import { getServiceClient } from './supabase.ts'

export interface AuthedUser {
  email: string
  name: string | null
  department_id: string | null
  manager_email: string | null
  roles: string[]
  permissions: string[]
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
    .select('email, name, department_id, manager_email')
    .eq('email', payload.sub)
    .maybeSingle()

  if (error || !user) throw new ApiError(401, 'Missing or expired token', 'AUTH_REQUIRED')

  const { roles, permissions } = await resolveAccess(user.email)
  return { ...user, roles, permissions }
}

export function requirePermission(user: AuthedUser, permission: string, message = 'You do not have permission to perform this action'): void {
  if (!user.permissions.includes(permission)) throw new ApiError(403, message, 'FORBIDDEN')
}
