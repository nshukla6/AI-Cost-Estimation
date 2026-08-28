import type { MockUser } from '@/mocks/db'

/**
 * Fake bearer token — base64 JSON, not a real signed JWT. Good enough to
 * round-trip identity through the Authorization header the same way a real
 * JWT would. Identity is email now (users are natural-keyed) — roles aren't
 * embedded, they're resolved fresh from db.users on every request, same as
 * the real Edge Function does via user_roles.
 */
interface TokenPayload {
  sub: string
  iat: number
  exp: number
}

export const TOKEN_TTL_SECONDS = 3600

export function createToken(user: MockUser): string {
  const payload: TokenPayload = {
    sub: user.email,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_SECONDS * 1000,
  }
  return btoa(JSON.stringify(payload))
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token)) as TokenPayload
    if (typeof payload.sub !== 'string' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getUserEmailFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const payload = decodeToken(authHeader.slice('Bearer '.length))
  return payload?.sub ?? null
}
