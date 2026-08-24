import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/components/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { appConfig } from '@/config/app.config'
import { ApiError } from '@/lib/api/config'
import { cn } from '@/lib/utils'

export function Login() {
  const { isAuthenticated, isLoading, loginWithPassword, loginWithSso, ssoEnabled, basicAuthEnabled } = useAuth()
  const [searchParams] = useSearchParams()
  const sessionExpiredShown = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired' && !sessionExpiredShown.current) {
      sessionExpiredShown.current = true
      toast.error('Your session has expired. Please log in again.')
    }
  }, [searchParams])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password')
      return
    }

    try {
      await loginWithPassword(email.trim(), password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid email or password')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className={cn('flex size-16 items-center justify-center text-2xl font-semibold text-white', appConfig.branding.logoContainerClassName)}>
            {appConfig.branding.logoInitial}
          </div>
          <h1 className="text-xl font-semibold">{appConfig.appName}</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {ssoEnabled && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-[#1b3e65] text-[#1b3e65] hover:bg-[#1b3e65] hover:text-white"
            onClick={loginWithSso}
          >
            Sign in with SSO
          </Button>
        )}

        {ssoEnabled && basicAuthEnabled && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {basicAuthEnabled && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary-hover" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
