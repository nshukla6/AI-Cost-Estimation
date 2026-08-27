import { Hono } from 'npm:hono@4'

import { ApiError } from './lib/errors.ts'
import { allocationRoutes } from './routes/allocation.ts'
import { authRoutes } from './routes/auth.ts'
import { costUploadRoutes } from './routes/costUploads.ts'
import { reportRoutes } from './routes/reports.ts'
import { userRoutes } from './routes/users.ts'
import { vendorRoutes } from './routes/vendors.ts'

// Routes below are registered at their bare paths (e.g. '/auth/login').
// Supabase's Function Gateway strips '/functions/v1' but forwards the
// function's own slug as part of the path (i.e. requests arrive as
// '/api/auth/login', not '/functions/v1/api/auth/login') — stripped here
// so the router doesn't need to know its own deployed slug.
const app = new Hono()
const FUNCTION_PATH_PREFIX = '/api'

// Auth here is our own Bearer token (see lib/crypto.ts), not a Supabase
// JWT, and this endpoint set is only ever called server-to-server (via the
// vercel.json rewrite) or directly during local testing — so a permissive
// CORS policy is fine; it's not exposing anything a same-origin call
// wouldn't already reach.
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})

app.route('/', authRoutes)
app.route('/', vendorRoutes)
app.route('/', userRoutes)
app.route('/', costUploadRoutes)
app.route('/', allocationRoutes)
app.route('/', reportRoutes)

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: err.message, code: err.code }, err.status as 400 | 401 | 403 | 404 | 409 | 422)
  }
  console.error(err)
  return c.json({ error: 'Something went wrong', code: 'INTERNAL_ERROR' }, 500)
})

Deno.serve((req) => {
  const url = new URL(req.url)
  if (url.pathname.startsWith(FUNCTION_PATH_PREFIX)) {
    url.pathname = url.pathname.slice(FUNCTION_PATH_PREFIX.length) || '/'
    req = new Request(url, req)
  }
  return app.fetch(req)
})
