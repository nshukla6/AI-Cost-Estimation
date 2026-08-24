import {
  Building2,
  LayoutDashboard,
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
  },
  {
    label: 'My Usage',
    path: '/my-usage',
    icon: UserRound,
    permission: PERMISSIONS.VIEW_OWN_USAGE,
  },
  {
    label: 'Vendors & Uploads',
    path: '/admin/vendors',
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
