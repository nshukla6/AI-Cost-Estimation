# Backend migration record

This tracks how the app's backend has moved from the in-browser mock
(`src/mocks/`) to Supabase, and what's left to do to move off Supabase to a
real backend server later. Update this file whenever that story changes —
it's meant to stay accurate, not be a one-time write-up.

## Where things stand today

| Layer | Today |
| --- | --- |
| Database | Supabase Postgres, project `ai-cost-estimation` (`cuypgdqbqiqctvbqfgjd`). Schema lives in [`db/schema.sql`](../db/schema.sql), portable to any Postgres. |
| API | One Supabase Edge Function, `supabase/functions/api/`, implementing the same route contract as `src/mocks/handlers.ts` (paths, methods, request/response JSON shapes, error codes). |
| File storage | Supabase Storage, private bucket `cost-sheets`. `cost_uploads.storage_provider/storage_bucket/storage_path` are provider-agnostic pointers — see "Storage" below. |
| Auth | Custom Bearer token (HMAC-SHA256, PBKDF2 password hashes), **not** Supabase Auth — see `supabase/functions/api/lib/crypto.ts`. Chosen specifically so auth isn't tied to Supabase. |
| Frontend wiring | Zero frontend code changes. `VITE_USE_MOCK_API=false` + `VITE_API_BASE_URL=/api/v1` (unchanged default) routes every `src/lib/api/*.api.ts` call through a `vercel.json` rewrite to the Edge Function. |
| Demo data | Seeded: 5 departments, 5 vendors, the same 14 demo users as `docs/DEMO_LOGINS.md` (password `password123` for all). No `cost_uploads`/`cost_records` seeded — upload a CSV through the app to populate those. |

## One-time setup still required (manual — no MCP/CLI tool does this)

The Edge Function needs a `JWT_SECRET` used to sign/verify access tokens.
This isn't set yet. Run **one** of:

```bash
# Via Supabase CLI
supabase secrets set JWT_SECRET=<paste a long random value> --project-ref cuypgdqbqiqctvbqfgjd
```

or set it in the dashboard: Project Settings → Edge Functions → Secrets.

Until this is set, every request that reaches `authenticate()` or
`/auth/login` will fail with a 500 (`JWT_SECRET is not set`) — this was
confirmed directly against the deployed function during setup; everything
before that point (routing, DB query, password verification against the
seeded hash) already works.

**Rotating this secret invalidates every issued access token** — every
logged-in user gets kicked back to the login page. Fine for a demo; worth
remembering in production.

## Testing against the real backend

1. Set `JWT_SECRET` (above).
2. Locally: copy `.env.example` to `.env` (`VITE_USE_MOCK_API=false` is
   already its default) and run the app — `VITE_API_BASE_URL=/api/v1` will
   hit the mock only if `VITE_USE_MOCK_API` is unset/true, so make sure
   `.env` is actually loaded.
3. Deployed on Vercel: the `vercel.json` rewrite (`/api/v1/* →
   https://cuypgdqbqiqctvbqfgjd.supabase.co/functions/v1/api/*`) handles
   routing automatically — no env var needed there beyond the mock toggle.
4. Log in with any account from `docs/DEMO_LOGINS.md` (e.g.
   `priya.sharma@company.com` / `password123`).

## Steps to move off Supabase to a real backend server later

The design goal throughout was: swapping the compute layer (Edge Functions
→ some other server) should touch the schema and the frontend as little as
possible. Concretely:

1. **Stand up the new server** (Node/Express, or anything) exposing the
   same routes as `supabase/functions/api/routes/*.ts` — same paths,
   methods, request/response JSON shapes, error codes. Hono's API
   (`c.req.query()`, `c.json()`, `c.req.param()`, middleware) is close
   enough to Express that porting each route handler is close to
   line-for-line, not a rewrite.
2. **Reuse `lib/crypto.ts` as-is.** It's built entirely on Web Crypto
   (`crypto.subtle`), which Node also exposes globally (Node 19+) — password
   hashing and token signing/verification need zero changes.
3. **Replace `lib/supabase.ts`'s `getServiceClient()`** with a direct
   Postgres client (`pg`, Prisma, Drizzle, whatever fits) pointed at
   wherever Postgres now lives. `db/schema.sql` is vanilla Postgres DDL —
   run it as-is (`psql -f db/schema.sql`) against the new database.
4. **Replace the Storage calls** (`supabase.storage.from(...).upload` /
   `.createSignedUrl`) with an Azure Blob adapter exposing the same two
   operations (`ContainerClient.uploadData`, a SAS URL in place of a signed
   URL). Because `cost_uploads.storage_provider/storage_bucket/storage_path`
   already store provider-agnostic pointers rather than a raw URL, this is
   an adapter swap, not a schema or calling-code change. New rows get
   `storage_provider = 'azure_blob'`; old Supabase-era rows keep working
   unmodified since the provider is stored per-row.
5. **Change one line in `vercel.json`** — swap the rewrite `destination`
   from the Supabase Functions URL to the new server's URL.
   `VITE_API_BASE_URL` stays `/api/v1` — no frontend or env var change, in
   any environment.
6. **Set `JWT_SECRET`** in the new server's environment. Reusing the same
   value keeps existing sessions valid through the cutover; rotating it
   logs everyone out.
7. **Decide how much of Supabase you're actually leaving.** This doesn't
   have to be all-or-nothing — e.g. you could move only the compute layer
   (Edge Functions → your own server) while still using Supabase's Postgres
   and Storage as the underlying infrastructure, or migrate all three at
   once. If migrating Postgres itself too, `pg_dump`/`pg_restore` (or
   Supabase's own backup export) moves the data — the schema is portable
   either way.

## Known gaps / deliberately out of scope so far

- **Multi-currency ingestion isn't wired up.** `cost_records` has
  `currency`/`exchange_rate_to_usd`/`amount_original` columns, but the CSV
  format the upload endpoint parses is still just `email,amount_usd` — every
  ingested row is stamped `currency='USD', exchange_rate_to_usd=1`. Extending
  this needs: a CSV format that carries a currency per row, and a decision
  on where the exchange rate comes from (a rate API, keyed off upload date
  or `cost_month`) and how it's threaded into
  `supabase/functions/api/routes/costUploads.ts`.
- **Unmatched CSV rows are silently dropped.** If an email in the CSV
  doesn't match any `users` row, that row's spend is discarded — the upload
  response only reports `records_matched` vs `records_processed`, nothing
  is persisted for the unmatched rows. Flagged but not fixed.
- **The `reason`-on-reupload UI doesn't exist yet.** The API
  (`POST /cost-uploads`) accepts and requires `reason` for `version > 1`
  (`REASON_REQUIRED` error code), and the DB constraint backstops it, but
  `src/pages/admin/Uploads.tsx` has no field for it yet — re-uploading a
  vendor/month that already has data will currently fail with no way to
  supply a reason from the UI.
- **`cost-uploads` insert isn't transactional.** The Edge Function does the
  storage upload, the soft-delete of prior records, the `cost_uploads`
  insert, and the `cost_records` insert as separate sequential Supabase
  calls, not wrapped in one DB transaction. A failure partway through (e.g.
  the network drops between steps) can leave things partially applied. Fine
  for a demo; a production build should wrap this in a Postgres function
  (`plpgsql`) called via RPC, or a proper transaction if/when using a
  direct Postgres client (Node migration, step 3 above, makes this easier).
- **RLS is still disabled** on all 5 tables. The Edge Function uses the
  service role key (bypasses RLS), and the browser never receives any
  Supabase key at all in this design — but the tables remain unprotected if
  ever queried directly (e.g. via the anon key). Still worth enabling with
  real policies before this goes beyond a demo.
- **`GET /cost-uploads/:id` and `/cost-uploads/:id/diff`** are implemented
  and deployed but not called by any current UI — ready for whenever an
  upload-detail or version-diff screen gets built.
