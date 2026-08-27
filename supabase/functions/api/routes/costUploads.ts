import { Hono } from 'npm:hono@4'

import { authenticate, requireRole } from '../lib/auth-middleware.ts'
import { sha256Hex } from '../lib/crypto.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const costUploadRoutes = new Hono()

const STORAGE_BUCKET = 'cost-sheets'

costUploadRoutes.post('/cost-uploads', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_tool_admin'], 'Only AI Tool Admins can upload cost sheets')

  const form = await c.req.formData()
  const vendorId = Number(form.get('vendor_id'))
  const costMonthRaw = String(form.get('cost_month'))
  // Every allocation/report query compares cost_month lexically as a range
  // and assumes it's always the 1st of a month — normalize here regardless
  // of what the client sent, so a stray day-of-month can't silently break
  // "This Month" filtering downstream (see docs/BACKEND_MIGRATION.md).
  const costMonth = /^\d{4}-\d{2}/.test(costMonthRaw) ? `${costMonthRaw.slice(0, 7)}-01` : costMonthRaw
  const force = form.get('force') === 'true'
  const reasonRaw = form.get('reason')
  const reason = typeof reasonRaw === 'string' && reasonRaw.trim() ? reasonRaw.trim() : null
  const file = form.get('file')

  if (!vendorId || !costMonth || !(file instanceof File)) {
    throw new ApiError(400, 'vendor_id, cost_month and file are required', 'BAD_REQUEST')
  }

  const supabase = getServiceClient()
  const fileBuffer = await file.arrayBuffer()
  const fileHash = await sha256Hex(fileBuffer)

  const { data: duplicate } = await supabase.from('cost_uploads').select('id').eq('vendor_id', vendorId).eq('file_hash', fileHash).maybeSingle()
  if (duplicate && !force) {
    throw new ApiError(409, 'This exact file was already uploaded', 'DUPLICATE_FILE')
  }

  const text = new TextDecoder().decode(fileBuffer)
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const dataLines = lines[0]?.toLowerCase().includes('email') ? lines.slice(1) : lines

  if (dataLines.length === 0) {
    throw new ApiError(422, 'CSV has no data rows — expected header "email,amount_usd"', 'VALIDATION_ERROR')
  }

  const parsedRows: { email: string; amount: number }[] = []
  for (let i = 0; i < dataLines.length; i++) {
    const [email, amountRaw] = dataLines[i].split(',').map((cell) => cell.trim())
    const amount = Number(amountRaw)
    if (!email || Number.isNaN(amount)) {
      throw new ApiError(422, `Row ${i + 1}: expected "email,amount_usd"`, 'VALIDATION_ERROR')
    }
    parsedRows.push({ email, amount })
  }

  const { data: priorUploads } = await supabase.from('cost_uploads').select('version').eq('vendor_id', vendorId).eq('cost_month', costMonth)
  const nextVersion = priorUploads && priorUploads.length > 0 ? Math.max(...priorUploads.map((u) => u.version)) + 1 : 1

  // DB constraint (cost_uploads_reason_required_on_reupload) backstops this,
  // but checking here gives a clean, specific error instead of a raw
  // Postgres constraint-violation message. 409, not 422: this isn't malformed
  // input, it's a conflict with the existing upload for this vendor/month —
  // same category as DUPLICATE_FILE below, which the frontend also treats
  // as "confirm and resubmit" rather than a plain validation failure.
  if (nextVersion > 1 && !reason) {
    throw new ApiError(409, 'A reason is required when re-uploading a cost sheet for a vendor/month that already has an upload', 'REASON_REQUIRED')
  }

  const storagePath = `${vendorId}/${costMonth}/${fileHash}_${file.name}`
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: file.type || 'text/csv',
    upsert: true,
  })
  if (uploadError) throw uploadError

  // Soft-delete the prior version's records for this vendor+month.
  await supabase
    .from('cost_records')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('vendor_id', vendorId)
    .eq('cost_month', costMonth)
    .eq('is_deleted', false)

  const { data: upload, error: insertUploadError } = await supabase
    .from('cost_uploads')
    .insert({
      vendor_id: vendorId,
      cost_month: costMonth,
      version: nextVersion,
      status: 'success',
      file_name: file.name,
      file_hash: fileHash,
      storage_provider: 'supabase',
      storage_bucket: STORAGE_BUCKET,
      storage_path: storagePath,
      uploaded_by_id: user.id,
      uploaded_at: new Date().toISOString(),
      record_count: parsedRows.length,
      reason,
    })
    .select('*')
    .single()
  if (insertUploadError) throw insertUploadError

  // Cost sheets identify people by email, not user_id — resolved once here
  // at ingest time so every downstream report query is a plain FK join.
  const { data: matchableUsers } = await supabase.from('users').select('id, email')
  const emailToUserId = new Map((matchableUsers ?? []).map((u) => [u.email.toLowerCase(), u.id]))

  let matchedCount = 0
  const recordsToInsert: Record<string, unknown>[] = []
  for (const row of parsedRows) {
    const userId = emailToUserId.get(row.email.toLowerCase())
    if (!userId) continue
    matchedCount++
    recordsToInsert.push({
      upload_id: upload.id,
      user_id: userId,
      vendor_id: vendorId,
      cost_month: costMonth,
      // CSV format today is "email,amount_usd" only — no per-row currency
      // yet. Every ingested row is USD until the CSV format and a rate
      // source are extended (see docs/BACKEND_MIGRATION.md).
      currency: 'USD',
      exchange_rate_to_usd: 1,
      amount_original: row.amount,
      amount_usd: row.amount,
      is_deleted: false,
    })
  }
  if (recordsToInsert.length > 0) {
    const { error: insertRecordsError } = await supabase.from('cost_records').insert(recordsToInsert)
    if (insertRecordsError) throw insertRecordsError
  }

  return c.json(
    {
      id: upload.id,
      vendor_id: upload.vendor_id,
      cost_month: upload.cost_month,
      version: upload.version,
      status: upload.status,
      records_processed: upload.record_count,
      records_matched: matchedCount,
    },
    201,
  )
})

costUploadRoutes.get('/cost-uploads', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_tool_admin', 'ai_cost_manager'])

  const supabase = getServiceClient()
  let query = supabase
    .from('cost_uploads')
    .select('id, vendor_id, cost_month, version, status, file_name, uploaded_at, record_count, reason, uploaded_by:users!cost_uploads_uploaded_by_id_fkey(id, name)')
    .order('uploaded_at', { ascending: false })

  const vendorId = c.req.query('vendor_id')
  const costMonth = c.req.query('cost_month')
  if (vendorId) query = query.eq('vendor_id', Number(vendorId))
  if (costMonth) query = query.eq('cost_month', costMonth)

  const { data, error } = await query
  if (error) throw error
  return c.json(data)
})

costUploadRoutes.get('/cost-uploads/:id', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_tool_admin', 'ai_cost_manager'])

  const supabase = getServiceClient()
  const { data: upload, error } = await supabase
    .from('cost_uploads')
    .select('*, uploaded_by:users!cost_uploads_uploaded_by_id_fkey(id, name)')
    .eq('id', Number(c.req.param('id')))
    .maybeSingle()
  if (error) throw error
  if (!upload) throw new ApiError(404, 'Upload not found', 'NOT_FOUND')

  // Bucket is private — a short-lived signed URL, not a public link.
  const { data: signed } = await supabase.storage.from(upload.storage_bucket).createSignedUrl(upload.storage_path, 3600)

  return c.json({ ...upload, blob_path: signed?.signedUrl ?? null })
})

costUploadRoutes.get('/cost-uploads/:id/diff', async (c) => {
  const user = await authenticate(c)
  requireRole(user, ['ai_tool_admin', 'ai_cost_manager'])

  const uploadId = Number(c.req.param('id'))
  const compareToId = Number(c.req.query('compare_to'))

  const supabase = getServiceClient()
  const { data: records, error } = await supabase.from('cost_records').select('upload_id, user_id, amount_usd').in('upload_id', [uploadId, compareToId])
  if (error) throw error

  const { data: users } = await supabase.from('users').select('id, name')

  const afterByUser = new Map<number, number>()
  const beforeByUser = new Map<number, number>()
  for (const record of records ?? []) {
    if (record.upload_id === uploadId) afterByUser.set(record.user_id, (afterByUser.get(record.user_id) ?? 0) + record.amount_usd)
    if (record.upload_id === compareToId) beforeByUser.set(record.user_id, (beforeByUser.get(record.user_id) ?? 0) + record.amount_usd)
  }

  const userIds = new Set([...afterByUser.keys(), ...beforeByUser.keys()])
  const diff = Array.from(userIds).map((userId) => ({
    user_id: userId,
    user_name: users?.find((u) => u.id === userId)?.name ?? `User #${userId}`,
    before_usd: Math.round((beforeByUser.get(userId) ?? 0) * 100) / 100,
    after_usd: Math.round((afterByUser.get(userId) ?? 0) * 100) / 100,
  }))

  return c.json(diff)
})
