import { appConfig } from '@/config/app.config'

export class ApiError extends Error {
  code?: string
  status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null
  /** Skip attaching the bearer token, e.g. for /auth/login. */
  skipAuth?: boolean
}

function getStoredToken(): string | null {
  return localStorage.getItem(appConfig.auth.tokenStorageKey)
}

function clearAuthStorage(): void {
  localStorage.removeItem(appConfig.auth.tokenStorageKey)
  localStorage.removeItem(appConfig.auth.userStorageKey)
}

function handleSessionExpiry(): void {
  clearAuthStorage()
  const target = `/login?reason=session_expired`
  if (window.location.pathname + window.location.search !== target) {
    window.location.href = target
  }
}

/**
 * Shared fetch client for /lib/api/*.api.ts files.
 * See docs/AI_Cost_Tracking_API_Design.docx section 2 for conventions:
 * base URL /api/v1, Bearer auth, JSON body/response, error shape
 * { error, code }.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options

  const isFormData = body instanceof FormData
  const requestHeaders = new Headers(headers)

  if (!isFormData && body !== undefined && body !== null) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getStoredToken()
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: isFormData || body === undefined || body === null || typeof body === 'string' ? (body as BodyInit | null | undefined) : JSON.stringify(body),
  })

  if (response.status === 401 || response.status === 403) {
    handleSessionExpiry()
    throw new ApiError('Your session has expired. Please log in again.', response.status, 'SESSION_EXPIRED')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload ? String((payload as { error: unknown }).error) : 'Something went wrong'
    const code = typeof payload === 'object' && payload && 'code' in payload ? String((payload as { code: unknown }).code) : undefined
    throw new ApiError(message, response.status, code)
  }

  // Every endpoint here (uploads/exports use their own fetch calls) always
  // responds with JSON on success — a non-JSON 200 means there's no real
  // backend behind apiBaseUrl yet (e.g. a dev server SPA-fallback page).
  if (!isJson) {
    throw new ApiError('Unexpected response from server — is the API reachable?', response.status)
  }

  return payload as T
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
