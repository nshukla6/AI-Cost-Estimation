import { createClient } from 'npm:@supabase/supabase-js@2'

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically into
// every deployed Edge Function's environment — not something we set.
// Service role bypasses RLS, which is fine here: this function is the only
// thing meant to talk to Postgres directly, the browser never gets a
// Supabase key at all (see docs/BACKEND_MIGRATION.md).
export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
