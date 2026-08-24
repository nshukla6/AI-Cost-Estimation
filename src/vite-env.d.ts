/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SSO_ENABLED?: string
  readonly VITE_BASIC_AUTH_ENABLED?: string
  readonly VITE_SSO_LOGIN_URL?: string
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
