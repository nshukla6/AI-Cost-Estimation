// Resolves a user's roles and the union of permissions across all of
// them — a user can hold more than one role (user_roles has no
// unique(user_email)), so this always unions rather than assuming one row.
import { getServiceClient } from './supabase.ts'

export async function resolveRoles(email: string): Promise<string[]> {
  const supabase = getServiceClient()
  const { data } = await supabase.from('user_roles').select('role_code').eq('user_email', email)
  return (data ?? []).map((r) => r.role_code)
}

export async function resolvePermissions(roles: string[]): Promise<string[]> {
  if (roles.length === 0) return []
  const supabase = getServiceClient()
  const { data } = await supabase.from('role_permissions').select('permission_code').in('role_code', roles)
  return Array.from(new Set((data ?? []).map((p) => p.permission_code)))
}

export async function resolveAccess(email: string): Promise<{ roles: string[]; permissions: string[] }> {
  const roles = await resolveRoles(email)
  const permissions = await resolvePermissions(roles)
  return { roles, permissions }
}
