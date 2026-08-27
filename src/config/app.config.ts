export const appConfig = {
  appName: 'AI Cost Estimation App',
  appShortName: 'AI Cost Estimation',

  // `||`, not `??` — a VITE_API_BASE_URL set to an empty string (not just
  // unset) must also fall back to the default, or every request silently
  // loses the /api/v1 prefix and hits the frontend's own domain instead.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',

  branding: {
    logoInitial: 'A',
    // bg-[#059688], rounded-2xl — see docs/BUTTON_COLORS_REFERENCE.md
    logoContainerClassName: 'bg-logo rounded-2xl',
  },

  auth: {
    // Both toggleable independently; when both are true the login page
    // offers SSO first with a "sign in with email" fallback.
    ssoEnabled: import.meta.env.VITE_SSO_ENABLED === 'true',
    basicAuthEnabled: import.meta.env.VITE_BASIC_AUTH_ENABLED !== 'false',
    ssoLoginUrl: import.meta.env.VITE_SSO_LOGIN_URL ?? '/api/v1/auth/saml/login',
    tokenStorageKey: 'aice.access_token',
    userStorageKey: 'aice.user',
  },

  featureFlags: {
    costUploadEnabled: true,
    uploadHistoryEnabled: true,
    reportExportEnabled: true,
  },

  // Serves every request in src/lib/api/*.api.ts from an in-browser mock
  // (src/mocks/) backed by localStorage instead of a real server. Flip to
  // false (or unset) once VITE_API_BASE_URL points at a real backend — no
  // other code changes needed since the mock intercepts fetch() itself.
  mock: {
    enabled: import.meta.env.VITE_USE_MOCK_API !== 'false',
  },
} as const
