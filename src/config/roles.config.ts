/**
 * Roles come from the `role` claim in the auth JWT (see
 * docs/AI_Cost_Tracking_API_Design.docx, section 3).
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

/**
 * Team usage (GET /reports/team) is not role-gated on the backend — any
 * user with direct reports can see it. It is included for every role here;
 * screens should additionally check `currentUser.managesReports`.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [PERMISSIONS.VIEW_OWN_USAGE, PERMISSIONS.VIEW_TEAM_USAGE],
  ai_cost_manager: [
    PERMISSIONS.VIEW_OWN_USAGE,
    PERMISSIONS.VIEW_TEAM_USAGE,
    PERMISSIONS.VIEW_DEPARTMENT_USAGE,
    PERMISSIONS.VIEW_ORG_USAGE,
    PERMISSIONS.DOWNLOAD_REPORTS,
    PERMISSIONS.VIEW_UPLOAD_HISTORY,
    PERMISSIONS.VIEW_USERS,
  ],
  // "Can see all the screens but can not download the reports."
  ai_tool_admin: [
    PERMISSIONS.VIEW_OWN_USAGE,
    PERMISSIONS.VIEW_TEAM_USAGE,
    PERMISSIONS.VIEW_DEPARTMENT_USAGE,
    PERMISSIONS.VIEW_ORG_USAGE,
    PERMISSIONS.UPLOAD_COST_SHEET,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.VIEW_UPLOAD_HISTORY,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USER_ROLES,
  ],
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
