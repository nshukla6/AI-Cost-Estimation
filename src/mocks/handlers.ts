import { delay, http, HttpResponse } from 'msw'

import { appConfig } from '@/config/app.config'
import type { Role } from '@/config/roles.config'
import { computeDepartmentUsage, computeMyUsage, computeOrgUsage, computeTeamUsage, generateOrgReportCsv } from '@/mocks/allocation'
import { loadDb, saveDb, type MockCostUpload, type MockUser } from '@/mocks/db'
import { sha256Hex } from '@/mocks/hash'
import { createToken, getUserIdFromAuthHeader, TOKEN_TTL_SECONDS } from '@/mocks/token'
import type { OrgUsageGroupBy } from '@/types/domain'

function url(path: string): string {
  return `${appConfig.apiBaseUrl}${path}`
}

function errorResponse(status: number, error: string, code?: string) {
  return HttpResponse.json({ error, code }, { status })
}

function publicUser(user: MockUser) {
  const { password: _password, ...rest } = user
  return rest
}

interface AuthContext {
  user: MockUser
}

/** Mirrors "every endpoint except login requires Authorization: Bearer <jwt>". */
function authenticate(request: Request): AuthContext | Response {
  const db = loadDb()
  const userId = getUserIdFromAuthHeader(request.headers.get('Authorization'))
  const user = userId !== null ? db.users.find((u) => u.id === userId) : undefined

  if (!user) {
    return errorResponse(401, 'Missing or expired token', 'AUTH_REQUIRED')
  }
  return { user }
}

function requireRole(auth: AuthContext, roles: Role[], message = 'You do not have permission to perform this action'): Response | null {
  if (!roles.includes(auth.user.role)) {
    return errorResponse(403, message, 'FORBIDDEN')
  }
  return null
}

function isAuthError(value: AuthContext | Response): value is Response {
  return value instanceof Response
}

export const handlers = [
  // -- Auth -------------------------------------------------------------
  http.post(url('/auth/login'), async ({ request }) => {
    await delay(300)
    const db = loadDb()
    const body = (await request.json()) as { email?: string; password?: string }
    const email = body.email?.trim().toLowerCase()

    const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === body.password)
    if (!user) {
      return errorResponse(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS')
    }

    return HttpResponse.json({
      access_token: createToken(user),
      expires_in: TOKEN_TTL_SECONDS,
      user: publicUser(user),
    })
  }),

  // -- Vendors ------------------------------------------------------------
  http.get(url('/vendors'), async ({ request }) => {
    await delay(200)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth

    const db = loadDb()
    const isActiveParam = new URL(request.url).searchParams.get('is_active')
    const vendors = isActiveParam === null ? db.vendors : db.vendors.filter((v) => String(v.is_active) === isActiveParam)
    return HttpResponse.json(vendors)
  }),

  http.put(url('/vendors/:id'), async ({ request, params }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin'], 'Only AI Tool Admins can manage vendors')
    if (forbidden) return forbidden

    const db = loadDb()
    const vendor = db.vendors.find((v) => v.id === Number(params.id))
    if (!vendor) return errorResponse(404, 'Vendor not found', 'NOT_FOUND')

    const body = (await request.json()) as { is_active: boolean }
    vendor.is_active = body.is_active
    saveDb(db)
    return HttpResponse.json(vendor)
  }),

  // -- Cost uploads ---------------------------------------------------------
  http.post(url('/cost-uploads'), async ({ request }) => {
    await delay(500)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin'], 'Only AI Tool Admins can upload cost sheets')
    if (forbidden) return forbidden

    const form = await request.formData()
    const vendorId = Number(form.get('vendor_id'))
    const costMonth = String(form.get('cost_month'))
    const force = form.get('force') === 'true'
    const file = form.get('file')

    if (!vendorId || !costMonth || !(file instanceof File)) {
      return errorResponse(400, 'vendor_id, cost_month and file are required', 'BAD_REQUEST')
    }

    const db = loadDb()
    const fileHash = await sha256Hex(file)

    const exactDuplicate = db.costUploads.find((u) => u.vendor_id === vendorId && u.file_hash === fileHash)
    if (exactDuplicate && !force) {
      return errorResponse(409, 'This exact file was already uploaded', 'DUPLICATE_FILE')
    }

    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const dataLines = lines[0]?.toLowerCase().includes('email') ? lines.slice(1) : lines

    if (dataLines.length === 0) {
      return errorResponse(422, 'CSV has no data rows — expected header "email,amount_usd"', 'VALIDATION_ERROR')
    }

    const parsedRows: { email: string; amount: number }[] = []
    for (let i = 0; i < dataLines.length; i++) {
      const [email, amountRaw] = dataLines[i].split(',').map((cell) => cell.trim())
      const amount = Number(amountRaw)
      if (!email || Number.isNaN(amount)) {
        return errorResponse(422, `Row ${i + 1}: expected "email,amount_usd"`, 'VALIDATION_ERROR')
      }
      parsedRows.push({ email, amount })
    }

    const priorUploadsForMonth = db.costUploads.filter((u) => u.vendor_id === vendorId && u.cost_month === costMonth)
    const nextVersion = priorUploadsForMonth.length > 0 ? Math.max(...priorUploadsForMonth.map((u) => u.version)) + 1 : 1

    // Soft-delete the prior version's records for this vendor+month.
    for (const record of db.costRecords) {
      if (record.vendor_id === vendorId && record.cost_month === costMonth && !record.deleted) {
        record.deleted = true
      }
    }

    const upload: MockCostUpload = {
      id: db.nextId.costUploads++,
      vendor_id: vendorId,
      cost_month: costMonth,
      version: nextVersion,
      status: 'success',
      file_name: file.name,
      file_hash: fileHash,
      uploaded_by: { id: auth.user.id, name: auth.user.name },
      uploaded_at: new Date().toISOString(),
      record_count: parsedRows.length,
    }
    db.costUploads.push(upload)

    let matchedCount = 0
    for (const row of parsedRows) {
      const matchedUser = db.users.find((u) => u.email.toLowerCase() === row.email.toLowerCase())
      if (!matchedUser) continue
      matchedCount++
      db.costRecords.push({
        id: db.nextId.costRecords++,
        upload_id: upload.id,
        user_id: matchedUser.id,
        vendor_id: vendorId,
        cost_month: costMonth,
        amount_usd: row.amount,
        deleted: false,
      })
    }

    saveDb(db)
    return HttpResponse.json(
      {
        id: upload.id,
        vendor_id: upload.vendor_id,
        cost_month: upload.cost_month,
        version: upload.version,
        status: upload.status,
        records_processed: upload.record_count,
        records_matched: matchedCount,
      },
      { status: 201 },
    )
  }),

  http.get(url('/cost-uploads'), async ({ request }) => {
    await delay(200)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin', 'ai_cost_manager'])
    if (forbidden) return forbidden

    const db = loadDb()
    const params = new URL(request.url).searchParams
    const vendorId = params.get('vendor_id')
    const costMonth = params.get('cost_month')

    let uploads = db.costUploads
    if (vendorId) uploads = uploads.filter((u) => u.vendor_id === Number(vendorId))
    if (costMonth) uploads = uploads.filter((u) => u.cost_month === costMonth)

    return HttpResponse.json([...uploads].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)))
  }),

  http.get(url('/cost-uploads/:id'), async ({ request, params }) => {
    await delay(200)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin', 'ai_cost_manager'])
    if (forbidden) return forbidden

    const db = loadDb()
    const upload = db.costUploads.find((u) => u.id === Number(params.id))
    if (!upload) return errorResponse(404, 'Upload not found', 'NOT_FOUND')

    return HttpResponse.json({ ...upload, blob_path: `mock://cost-uploads/${upload.id}/${upload.file_name}` })
  }),

  http.get(url('/cost-uploads/:id/diff'), async ({ request, params }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin', 'ai_cost_manager'])
    if (forbidden) return forbidden

    const db = loadDb()
    const uploadId = Number(params.id)
    const compareToId = Number(new URL(request.url).searchParams.get('compare_to'))

    const afterByUser = new Map<number, number>()
    const beforeByUser = new Map<number, number>()
    for (const record of db.costRecords) {
      if (record.upload_id === uploadId) afterByUser.set(record.user_id, (afterByUser.get(record.user_id) ?? 0) + record.amount_usd)
      if (record.upload_id === compareToId) beforeByUser.set(record.user_id, (beforeByUser.get(record.user_id) ?? 0) + record.amount_usd)
    }

    const userIds = new Set([...afterByUser.keys(), ...beforeByUser.keys()])
    const diff = Array.from(userIds).map((userId) => ({
      user_id: userId,
      user_name: db.users.find((u) => u.id === userId)?.name ?? `User #${userId}`,
      before_usd: Math.round((beforeByUser.get(userId) ?? 0) * 100) / 100,
      after_usd: Math.round((afterByUser.get(userId) ?? 0) * 100) / 100,
    }))

    return HttpResponse.json(diff)
  }),

  // -- Users & roles --------------------------------------------------------
  http.get(url('/users'), async ({ request }) => {
    await delay(200)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin', 'ai_cost_manager'])
    if (forbidden) return forbidden

    const db = loadDb()
    const params = new URL(request.url).searchParams
    const departmentId = params.get('department_id')
    const role = params.get('role')
    const managerId = params.get('manager_id')

    let users = db.users
    if (departmentId) users = users.filter((u) => u.department_id === Number(departmentId))
    if (role) users = users.filter((u) => u.role === role)
    if (managerId) users = users.filter((u) => u.manager_id === Number(managerId))

    return HttpResponse.json(users.map(publicUser))
  }),

  http.put(url('/users/:id/role'), async ({ request, params }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_tool_admin'], 'Only AI Tool Admins can change user roles')
    if (forbidden) return forbidden

    const body = (await request.json()) as { role: Role }
    if (body.role !== 'viewer') {
      return errorResponse(403, 'AI Tool Admins can only set a user’s role to viewer', 'FORBIDDEN')
    }

    const db = loadDb()
    const user = db.users.find((u) => u.id === Number(params.id))
    if (!user) return errorResponse(404, 'User not found', 'NOT_FOUND')

    user.role = body.role
    saveDb(db)
    return HttpResponse.json(publicUser(user))
  }),

  // -- Allocation -----------------------------------------------------------
  http.get(url('/allocation/my-usage'), async ({ request }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth

    const db = loadDb()
    const params = new URL(request.url).searchParams
    return HttpResponse.json(computeMyUsage(db, auth.user.id, { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined }))
  }),

  http.get(url('/allocation/team'), async ({ request }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth

    const db = loadDb()
    const params = new URL(request.url).searchParams
    return HttpResponse.json(computeTeamUsage(db, auth.user.id, { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined }))
  }),

  http.get(url('/allocation/department/:departmentId'), async ({ request, params }) => {
    await delay(300)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    // The API design doc scopes this to ai_cost_manager only, but the build
    // prompt asks for ai_tool_admin to "see all the screens" (just not
    // download) — so both roles are allowed through here.
    const forbidden = requireRole(auth, ['ai_cost_manager', 'ai_tool_admin'])
    if (forbidden) return forbidden

    const db = loadDb()
    const searchParams = new URL(request.url).searchParams
    return HttpResponse.json(
      computeDepartmentUsage(db, Number(params.departmentId), { from: searchParams.get('from') ?? undefined, to: searchParams.get('to') ?? undefined }),
    )
  }),

  http.get(url('/allocation/org'), async ({ request }) => {
    await delay(300)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_cost_manager', 'ai_tool_admin'])
    if (forbidden) return forbidden

    const db = loadDb()
    const params = new URL(request.url).searchParams
    const groupBy = (params.get('group_by') as OrgUsageGroupBy | null) ?? 'department'
    return HttpResponse.json(computeOrgUsage(db, { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined, groupBy }))
  }),

  // -- Reports ----------------------------------------------------------
  http.get(url('/reports/org/export'), async ({ request }) => {
    await delay(400)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requireRole(auth, ['ai_cost_manager'], 'Only AI Cost Managers can download reports')
    if (forbidden) return forbidden

    const db = loadDb()
    const params = new URL(request.url).searchParams
    const groupBy = (params.get('group_by') as OrgUsageGroupBy | null) ?? 'department'
    const format = params.get('format') ?? 'csv'
    const csv = generateOrgReportCsv(db, { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined, groupBy })

    return new HttpResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ai-cost-report.${format}"`,
      },
    })
  }),
]
