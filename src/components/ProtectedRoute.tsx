import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/components/AuthContext'
import type { Permission } from '@/config/roles.config'

interface ProtectedRouteProps {
  permission?: Permission
}

export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
