import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { appConfig } from '@/config/app.config'
import { roleHasPermission, type Permission } from '@/config/roles.config'
import { authApi } from '@/lib/api/auth.api'
import type { AuthUser } from '@/types/domain'

interface AuthContextValue {
  currentUser: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  ssoEnabled: boolean
  basicAuthEnabled: boolean
  loginWithPassword: (email: string, password: string) => Promise<void>
  loginWithSso: () => void
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  /** True when other users have this account set as manager_id. */
  managesReports: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(appConfig.auth.userStorageKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function persistSession(token: string, user: AuthUser): void {
  localStorage.setItem(appConfig.auth.tokenStorageKey, token)
  localStorage.setItem(appConfig.auth.userStorageKey, JSON.stringify(user))
}

function clearSession(): void {
  localStorage.removeItem(appConfig.auth.tokenStorageKey)
  localStorage.removeItem(appConfig.auth.userStorageKey)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState(false)

  // SSO callback: the identity provider redirects back with ?token=&user=
  // (backend-issued JWT + serialized user). Adjust once the real SAML
  // callback contract is finalized.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userParam = params.get('user')
    if (token && userParam) {
      try {
        const user = JSON.parse(atob(userParam)) as AuthUser
        persistSession(token, user)
        setCurrentUser(user)
      } finally {
        params.delete('token')
        params.delete('user')
        const newSearch = params.toString()
        window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''))
      }
    }
  }, [])

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { access_token, user } = await authApi.login(email, password)
      persistSession(access_token, user)
      setCurrentUser(user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithSso = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.origin)
    window.location.href = `${appConfig.auth.ssoLoginUrl}?return_to=${returnTo}`
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setCurrentUser(null)
  }, [])

  const hasPermission = useCallback(
    (permission: Permission) => (currentUser ? roleHasPermission(currentUser.role, permission) : false),
    [currentUser],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: currentUser !== null,
      isLoading,
      ssoEnabled: appConfig.auth.ssoEnabled,
      basicAuthEnabled: appConfig.auth.basicAuthEnabled,
      loginWithPassword,
      loginWithSso,
      logout,
      hasPermission,
      // manager_id relationships live server-side; until /users is queried
      // this is a placeholder any role/manager screen can refine.
      managesReports: currentUser !== null,
    }),
    [currentUser, isLoading, loginWithPassword, loginWithSso, logout, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
