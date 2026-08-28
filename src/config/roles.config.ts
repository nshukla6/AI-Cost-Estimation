/**
 * Roles come from the backend now (roles / permissions / role_permissions
 * tables), resolved server-side and returned on login as
 * `user.roles`/`user.permissions` — this file no longer hardcodes which
 * permissions a role has. `PERMISSIONS` stays as typo-safe constants (the
 * values must match `permissions.permission_code` in the database); `Role`
 * and `ROLE_LABELS` stay as display/typing sugar for the fixed 3 roles that
 * exist today.
 */
export type Role = 'viewer' | 'ai_cost_manager' | 'ai_tool_admin'

export const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Viewer',
  ai_cost_manager: 'AI Cost Manager',
  ai_tool_admin: 'AI Tool Admin',
}

export const PERMISSIONS = {
  VIEW_OWN_USAGE: 'usage.view_own',
  VIEW_TEAM_USAGE: 'usage.view_team',
  VIEW_DEPARTMENT_USAGE: 'usage.view_department',
  VIEW_ORG_USAGE: 'usage.view_org',
  DOWNLOAD_REPORTS: 'reports.download',
  UPLOAD_COST_SHEET: 'vendors.upload_cost_sheet',
  MANAGE_VENDORS: 'vendors.manage',
  VIEW_UPLOAD_HISTORY: 'vendors.view_upload_history',
  VIEW_USERS: 'users.view',
  MANAGE_USER_ROLES: 'users.manage_roles',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
