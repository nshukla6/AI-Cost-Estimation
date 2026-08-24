import type { MockUser } from '@/mocks/db'

/**
 * Fake bearer token — base64 JSON, not a real signed JWT. Good enough to
 * round-trip identity through the Authorization header the same way a real
 * JWT would.
 */
interface TokenPayload {
  sub: number
  role: string
  iat: number
  exp: number
}

export const TOKEN_TTL_SECONDS = 3600

export function createToken(user: MockUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_SECONDS * 1000,
  }
  return btoa(JSON.stringify(payload))
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token)) as TokenPayload
    if (typeof payload.sub !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getUserIdFromAuthHeader(authHeader: string | null): number | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const payload = decodeToken(authHeader.slice('Bearer '.length))
  return payload?.sub ?? null
}
