import {
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Upload,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { PERMISSIONS, type Permission } from '@/config/roles.config'
import { DEPARTMENTS } from '@/lib/departments'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permission: Permission
  children?: { label: string; path: string }[]
  /** Hide this item unless the logged-in user has direct reports. */
  requiresManager?: boolean
}

export const navigationConfig: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.VIEW_ORG_USAGE,
  },
  {
    label: 'Departments',
    path: `/departments/${DEPARTMENTS[0].id}`,
    icon: Building2,
    permission: PERMISSIONS.VIEW_DEPARTMENT_USAGE,
    children: DEPARTMENTS.map((department) => ({ label: department.name, path: `/departments/${department.id}` })),
  },
  {
    label: 'My Team',
    path: '/team',
    icon: Users,
    permission: PERMISSIONS.VIEW_TEAM_USAGE,
    requiresManager: true,
  },
  {
    label: 'My Usage',
    path: '/my-usage',
    icon: UserRound,
    permission: PERMISSIONS.VIEW_OWN_USAGE,
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: FileText,
    permission: PERMISSIONS.DOWNLOAD_REPORTS,
  },
  {
    label: 'Vendors',
    path: '/admin/vendors',
    icon: Package,
    permission: PERMISSIONS.MANAGE_VENDORS,
  },
  {
    label: 'Uploads',
    path: '/admin/uploads',
    icon: Upload,
    permission: PERMISSIONS.UPLOAD_COST_SHEET,
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: Users,
    permission: PERMISSIONS.VIEW_USERS,
  },
]
