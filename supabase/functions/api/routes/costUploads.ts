import { Hono } from 'npm:hono@4'

import { authenticate, requirePermission } from '../lib/auth-middleware.ts'
import { sha256Hex } from '../lib/crypto.ts'
import { ApiError } from '../lib/errors.ts'
import { getServiceClient } from '../lib/supabase.ts'

export const costUploadRoutes = new Hono()

const STORAGE_BUCKET = 'cost-sheets'

costUploadRoutes.post('/cost-uploads', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'vendors.upload_cost_sheet', 'Only AI Tool Admins can upload cost sheets')

  const form = await c.req.formData()
  const vendorCode = String(form.get('vendor_id') ?? form.get('vendor') ?? '')
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

  if (!vendorCode || !costMonth || !(file instanceof File)) {
    throw new ApiError(400, 'vendor, cost_month and file are required', 'BAD_REQUEST')
  }

  const supabase = getServiceClient()
  const fileBuffer = await file.arrayBuffer()
  const fileHash = await sha256Hex(fileBuffer)

  const { data: duplicate } = await supabase.from('cost_uploads').select('id').eq('vendor', vendorCode).eq('file_hash', fileHash).maybeSingle()
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

  const { data: priorUploads } = await supabase.from('cost_uploads').select('version').eq('vendor', vendorCode).eq('cost_month', costMonth)
  const nextVersion = priorUploads && priorUploads.length > 0 ? Math.max(...priorUploads.map((u) => u.version)) + 1 : 1

  // DB constraint (cost_uploads_reason_required_on_reupload) backstops this,
  // but checking here gives a clean, specific error instead of a raw
  // Postgres constraint-violation message. 409, not 422: this is a conflict
  // with the existing upload for this vendor/month, same category as
  // DUPLICATE_FILE — the frontend treats both as "confirm and resubmit."
  if (nextVersion > 1 && !reason) {
    throw new ApiError(409, 'A reason is required when re-uploading a cost sheet for a vendor/month that already has an upload', 'REASON_REQUIRED')
  }

  const storagePath = `${vendorCode}/${costMonth}/${fileHash}_${file.name}`
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: file.type || 'text/csv',
    upsert: true,
  })
  if (uploadError) throw uploadError

  // Soft-delete the prior version's records for this vendor+month.
  await supabase
    .from('cost_records')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('vendor', vendorCode)
    .eq('cost_month', costMonth)
    .eq('is_deleted', false)

  const { data: upload, error: insertUploadError } = await supabase
    .from('cost_uploads')
    .insert({
      vendor: vendorCode,
      cost_month: costMonth,
      version: nextVersion,
      status: 'success',
      file_name: file.name,
      file_hash: fileHash,
      storage_bucket: STORAGE_BUCKET,
      storage_path: storagePath,
      uploaded_by_email: user.email,
      uploaded_at: new Date().toISOString(),
      record_count: parsedRows.length,
      reason,
    })
    .select('*')
    .single()
  if (insertUploadError) throw insertUploadError

  // Cost sheets identify people by email, which is now the users table's
  // own primary key — no id lookup needed, just confirm the email exists
  // and use the table's exact casing as the FK value.
  const { data: matchableUsers } = await supabase.from('users').select('email')
  const knownEmails = new Map((matchableUsers ?? []).map((u) => [u.email.toLowerCase(), u.email]))

  let matchedCount = 0
  const recordsToInsert: Record<string, unknown>[] = []
  for (const row of parsedRows) {
    const canonicalEmail = knownEmails.get(row.email.toLowerCase())
    if (!canonicalEmail) continue
    matchedCount++
    recordsToInsert.push({
      upload_id: upload.id,
      user_email: canonicalEmail,
      vendor: vendorCode,
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
      vendor: upload.vendor,
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
  requirePermission(user, 'vendors.view_upload_history')

  const supabase = getServiceClient()
  let query = supabase
    .from('cost_uploads')
    .select('id, vendor, cost_month, version, status, file_name, uploaded_at, record_count, reason, uploaded_by:users!cost_uploads_uploaded_by_email_fkey(email, name)')
    .order('uploaded_at', { ascending: false })

  const vendorCode = c.req.query('vendor_id') ?? c.req.query('vendor')
  const costMonth = c.req.query('cost_month')
  if (vendorCode) query = query.eq('vendor', vendorCode)
  if (costMonth) query = query.eq('cost_month', costMonth)

  const { data, error } = await query
  if (error) throw error
  return c.json(data)
})

costUploadRoutes.get('/cost-uploads/:id', async (c) => {
  const user = await authenticate(c)
  requirePermission(user, 'vendors.view_upload_history')

  const supabase = getServiceClient()
  const { data: upload, error } = await supabase
    .from('cost_uploads')
    .select('*, uploaded_by:users!cost_uploads_uploaded_by_email_fkey(email, name)')
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
  requirePermission(user, 'vendors.view_upload_history')

  const uploadId = Number(c.req.param('id'))
  const compareToId = Number(c.req.query('compare_to'))

  const supabase = getServiceClient()
  const { data: records, error } = await supabase.from('cost_records').select('upload_id, user_email, amount_usd').in('upload_id', [uploadId, compareToId])
  if (error) throw error

  const { data: users } = await supabase.from('users').select('email, name')

  const afterByUser = new Map<string, number>()
  const beforeByUser = new Map<string, number>()
  for (const record of records ?? []) {
    if (record.upload_id === uploadId) afterByUser.set(record.user_email, (afterByUser.get(record.user_email) ?? 0) + record.amount_usd)
    if (record.upload_id === compareToId) beforeByUser.set(record.user_email, (beforeByUser.get(record.user_email) ?? 0) + record.amount_usd)
  }

  const userEmails = new Set([...afterByUser.keys(), ...beforeByUser.keys()])
  const diff = Array.from(userEmails).map((userEmail) => ({
    user_email: userEmail,
    user_name: users?.find((u) => u.email === userEmail)?.name ?? userEmail,
    before_usd: Math.round((beforeByUser.get(userEmail) ?? 0) * 100) / 100,
    after_usd: Math.round((afterByUser.get(userEmail) ?? 0) * 100) / 100,
  }))

  return c.json(diff)
})
