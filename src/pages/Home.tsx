import { Navigate } from 'react-router-dom'

import { useAuth } from '@/components/AuthContext'
import { navigationConfig } from '@/config/navigation.config'

/**
 * Root route — sends each role to the first screen they can see:
 * leadership/AI Cost Manager land on the org Dashboard, a plain Viewer
 * lands on My Usage.
 */
export function Home() {
  const { hasPermission } = useAuth()
  const firstAccessible = navigationConfig.find((item) => hasPermission(item.permission))

  return <Navigate to={firstAccessible?.path ?? '/unauthorized'} replace />
}
