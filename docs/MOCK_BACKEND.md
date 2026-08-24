# Mock Backend

Until a real backend exists, every request from `src/lib/api/*.api.ts`
is intercepted by [MSW](https://mswjs.io) (`src/mocks/`) and served from a
tiny in-browser "database" persisted to `localStorage`. Pages and API
files don't know the difference — they call `apiRequest()` and hit
`/api/v1/...` exactly as they would against a real server.

## How it's wired

- `src/mocks/db.ts` — the seed data (departments, vendors, users, cost
  uploads/records) and `localStorage` read/write (key `aice.mockdb.v3`).
- `src/mocks/handlers.ts` — one MSW handler per endpoint in
  `docs/AI_Cost_Tracking_API_Design.docx`, enforcing the same roles,
  status codes, and error shapes the real API is documented to use.
- `src/mocks/allocation.ts` — computes `/allocation/*` responses by
  summing `cost_records`, the same way the doc says the real backend will.
- `src/mocks/token.ts` — a fake bearer token (base64 JSON, not a signed
  JWT) so `Authorization: Bearer <token>` round-trips identity the same
  way it will for real.
- `src/main.tsx` — starts the mock service worker before the app renders,
  gated by `appConfig.mock.enabled`.

## Logging in

See [DEMO_LOGINS.md](./DEMO_LOGINS.md) for the seeded accounts (one per
role, plus manager/reportee chains for the Team screen).

## Uploading a cost sheet

The mock's CSV parser expects two columns:

```csv
email,amount_usd
rahul.khanna@company.com,42.50
anita.mehta@company.com,118.00
```

Rows for emails outside the seed data are still counted in
`records_processed` (matching the real API's contract) but are skipped
when creating cost records.

## Resetting the data

The mock only seeds once, then persists to `localStorage`. To start over,
run this in the browser console and reload:

```js
localStorage.removeItem('aice.mockdb.v3')
```

(This is separate from the logged-in session, `localStorage` keys
`aice.access_token` / `aice.user` — clear those too, or just log out, to
also reset who you're signed in as.)

## Swapping in a real backend

1. Point `VITE_API_BASE_URL` (see `.env.example`) at the real API.
2. Set `VITE_USE_MOCK_API=false`.
3. Delete `src/mocks/` and `public/mockServiceWorker.js` once you no
   longer need the mock for local dev/demos.

No changes are needed in `lib/api/`, `components/`, or `pages/` — they
were always talking to `/api/v1/...` over `fetch()`, mock or not.
