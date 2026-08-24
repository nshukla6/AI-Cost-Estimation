import { apiRequest } from '@/lib/api/config'
import type { AuthUser } from '@/types/domain'

export interface LoginResponse {
  access_token: string
  expires_in: number
  user: AuthUser
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    }),
}
