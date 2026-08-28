import { delay, http, HttpResponse } from 'msw'

import { appConfig } from '@/config/app.config'
import type { Role } from '@/config/roles.config'
import { computeDepartmentUsage, computeMyUsage, computeOrgUsage, computeTeamUsage, generateOrgReportCsv } from '@/mocks/allocation'
import { loadDb, MOCK_ROLE_PERMISSIONS, saveDb, type MockCostUpload, type MockUser } from '@/mocks/db'
import { sha256Hex } from '@/mocks/hash'
import { createToken, getUserEmailFromAuthHeader, TOKEN_TTL_SECONDS } from '@/mocks/token'
import type { OrgUsageGroupBy } from '@/types/domain'

function url(path: string): string {
  return `${appConfig.apiBaseUrl}${path}`
}

function errorResponse(status: number, error: string, code?: string) {
  return HttpResponse.json({ error, code }, { status })
}

function permissionsFor(roles: Role[]): string[] {
  return Array.from(new Set(roles.flatMap((role) => MOCK_ROLE_PERMISSIONS[role])))
}

function publicUser(user: MockUser) {
  const { password: _password, ...rest } = user
  return rest
}

interface AuthContext {
  user: MockUser
  permissions: string[]
}

/** Mirrors "every endpoint except login requires Authorization: Bearer <token>". */
function authenticate(request: Request): AuthContext | Response {
  const db = loadDb()
  const email = getUserEmailFromAuthHeader(request.headers.get('Authorization'))
  const user = email !== null ? db.users.find((u) => u.email === email) : undefined

  if (!user) {
    return errorResponse(401, 'Missing or expired token', 'AUTH_REQUIRED')
  }
  return { user, permissions: permissionsFor(user.roles) }
}

function requirePermission(auth: AuthContext, permission: string, message = 'You do not have permission to perform this action'): Response | null {
  if (!auth.permissions.includes(permission)) {
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
      user: { ...publicUser(user), permissions: permissionsFor(user.roles) },
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

  http.put(url('/vendors/:code'), async ({ request, params }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'vendors.manage', 'Only AI Tool Admins can manage vendors')
    if (forbidden) return forbidden

    const db = loadDb()
    const vendor = db.vendors.find((v) => v.code === params.code)
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
    const forbidden = requirePermission(auth, 'vendors.upload_cost_sheet', 'Only AI Tool Admins can upload cost sheets')
    if (forbidden) return forbidden

    const form = await request.formData()
    const vendorCode = String(form.get('vendor_id') ?? form.get('vendor') ?? '')
    const costMonthRaw = String(form.get('cost_month'))
    const costMonth = /^\d{4}-\d{2}/.test(costMonthRaw) ? `${costMonthRaw.slice(0, 7)}-01` : costMonthRaw
    const force = form.get('force') === 'true'
    const reasonRaw = form.get('reason')
    const reason = typeof reasonRaw === 'string' && reasonRaw.trim() ? reasonRaw.trim() : undefined
    const file = form.get('file')

    if (!vendorCode || !costMonth || !(file instanceof File)) {
      return errorResponse(400, 'vendor, cost_month and file are required', 'BAD_REQUEST')
    }

    const db = loadDb()
    const fileHash = await sha256Hex(file)

    const exactDuplicate = db.costUploads.find((u) => u.vendor === vendorCode && u.file_hash === fileHash)
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

    const priorUploadsForMonth = db.costUploads.filter((u) => u.vendor === vendorCode && u.cost_month === costMonth)
    const nextVersion = priorUploadsForMonth.length > 0 ? Math.max(...priorUploadsForMonth.map((u) => u.version)) + 1 : 1

    // 409, not 422: a conflict with the existing upload, same category as
    // DUPLICATE_FILE — the frontend treats both as "confirm and resubmit."
    if (nextVersion > 1 && !reason) {
      return errorResponse(409, 'A reason is required when re-uploading a cost sheet for a vendor/month that already has an upload', 'REASON_REQUIRED')
    }

    // Soft-delete the prior version's records for this vendor+month.
    for (const record of db.costRecords) {
      if (record.vendor === vendorCode && record.cost_month === costMonth && !record.deleted) {
        record.deleted = true
      }
    }

    const upload: MockCostUpload = {
      id: db.nextId.costUploads++,
      vendor: vendorCode,
      cost_month: costMonth,
      version: nextVersion,
      status: 'success',
      file_name: file.name,
      file_hash: fileHash,
      uploaded_by: { email: auth.user.email, name: auth.user.name },
      uploaded_at: new Date().toISOString(),
      record_count: parsedRows.length,
      reason,
    }
    db.costUploads.push(upload)

    const knownEmails = new Map(db.users.map((u) => [u.email.toLowerCase(), u.email]))
    let matchedCount = 0
    for (const row of parsedRows) {
      const canonicalEmail = knownEmails.get(row.email.toLowerCase())
      if (!canonicalEmail) continue
      matchedCount++
      db.costRecords.push({
        id: db.nextId.costRecords++,
        upload_id: upload.id,
        user_email: canonicalEmail,
        vendor: vendorCode,
        cost_month: costMonth,
        amount_usd: row.amount,
        deleted: false,
      })
    }

    saveDb(db)
    return HttpResponse.json(
      {
        id: upload.id,
        vendor: upload.vendor,
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
    const forbidden = requirePermission(auth, 'vendors.view_upload_history')
    if (forbidden) return forbidden

    const db = loadDb()
    const params = new URL(request.url).searchParams
    const vendorCode = params.get('vendor_id') ?? params.get('vendor')
    const costMonth = params.get('cost_month')

    let uploads = db.costUploads
    if (vendorCode) uploads = uploads.filter((u) => u.vendor === vendorCode)
    if (costMonth) uploads = uploads.filter((u) => u.cost_month === costMonth)

    return HttpResponse.json([...uploads].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)))
  }),

  http.get(url('/cost-uploads/:id'), async ({ request, params }) => {
    await delay(200)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'vendors.view_upload_history')
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
    const forbidden = requirePermission(auth, 'vendors.view_upload_history')
    if (forbidden) return forbidden

    const db = loadDb()
    const uploadId = Number(params.id)
    const compareToId = Number(new URL(request.url).searchParams.get('compare_to'))

    const afterByUser = new Map<string, number>()
    const beforeByUser = new Map<string, number>()
    for (const record of db.costRecords) {
      if (record.upload_id === uploadId) afterByUser.set(record.user_email, (afterByUser.get(record.user_email) ?? 0) + record.amount_usd)
      if (record.upload_id === compareToId) beforeByUser.set(record.user_email, (beforeByUser.get(record.user_email) ?? 0) + record.amount_usd)
    }

    const userEmails = new Set([...afterByUser.keys(), ...beforeByUser.keys()])
    const diff = Array.from(userEmails).map((userEmail) => ({
      user_email: userEmail,
      user_name: db.users.find((u) => u.email === userEmail)?.name ?? userEmail,
      before_usd: Math.round((beforeByUser.get(userEmail) ?? 0) * 100) / 100,
      after_usd: Math.round((afterByUser.get(userEmail) ?? 0) * 100) / 100,
    }))

    return HttpResponse.json(diff)
  }),

  // -- Users & roles --------------------------------------------------------
  http.get(url('/users'), async ({ request }) => {
    await delay(200)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'users.view')
    if (forbidden) return forbidden

    const db = loadDb()
    const params = new URL(request.url).searchParams
    const departmentId = params.get('department_id')
    const role = params.get('role') as Role | null
    const managerEmail = params.get('manager_email')

    let users = db.users
    if (departmentId) users = users.filter((u) => u.department_id === departmentId)
    if (role) users = users.filter((u) => u.roles.includes(role))
    if (managerEmail) users = users.filter((u) => u.manager_email === managerEmail)

    return HttpResponse.json(users.map(publicUser))
  }),

  // Available roles, for the role-assignment UI's picker.
  http.get(url('/roles'), async ({ request }) => {
    await delay(150)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'users.manage_roles')
    if (forbidden) return forbidden

    const db = loadDb()
    return HttpResponse.json(db.roles)
  }),

  http.post(url('/users/:email/roles'), async ({ request, params }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'users.manage_roles', 'Only AI Tool Admins can manage user roles')
    if (forbidden) return forbidden

    const db = loadDb()
    const targetEmail = decodeURIComponent(String(params.email))
    const user = db.users.find((u) => u.email === targetEmail)
    if (!user) return errorResponse(404, 'User not found', 'NOT_FOUND')

    const body = (await request.json()) as { role_code?: Role }
    if (!body.role_code) return errorResponse(400, 'role_code is required', 'BAD_REQUEST')
    if (!db.roles.some((r) => r.role_code === body.role_code)) return errorResponse(404, 'Role not found', 'NOT_FOUND')
    if (user.roles.includes(body.role_code)) return errorResponse(409, 'User already has this role', 'ROLE_ALREADY_ASSIGNED')

    user.roles.push(body.role_code)
    saveDb(db)
    return HttpResponse.json({ email: user.email, roles: user.roles }, { status: 201 })
  }),

  http.delete(url('/users/:email/roles/:roleCode'), async ({ request, params }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'users.manage_roles', 'Only AI Tool Admins can manage user roles')
    if (forbidden) return forbidden

    const db = loadDb()
    const targetEmail = decodeURIComponent(String(params.email))
    const user = db.users.find((u) => u.email === targetEmail)
    if (!user) return errorResponse(404, 'User not found', 'NOT_FOUND')

    const roleCode = params.roleCode as Role
    if (user.roles.length === 1 && user.roles[0] === roleCode) {
      return errorResponse(409, "Cannot remove a user's last role", 'LAST_ROLE')
    }

    user.roles = user.roles.filter((r) => r !== roleCode)
    saveDb(db)
    return HttpResponse.json({ email: user.email, roles: user.roles })
  }),

  // -- Allocation -----------------------------------------------------------
  http.get(url('/allocation/my-usage'), async ({ request }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth

    const db = loadDb()
    const params = new URL(request.url).searchParams
    return HttpResponse.json(computeMyUsage(db, auth.user.email, { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined }))
  }),

  http.get(url('/allocation/team'), async ({ request }) => {
    await delay(250)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth

    const db = loadDb()
    const params = new URL(request.url).searchParams
    return HttpResponse.json(computeTeamUsage(db, auth.user.email, { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined }))
  }),

  http.get(url('/allocation/department/:departmentId'), async ({ request, params }) => {
    await delay(300)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'usage.view_department')
    if (forbidden) return forbidden

    const db = loadDb()
    const searchParams = new URL(request.url).searchParams
    return HttpResponse.json(
      computeDepartmentUsage(db, String(params.departmentId), { from: searchParams.get('from') ?? undefined, to: searchParams.get('to') ?? undefined }),
    )
  }),

  http.get(url('/allocation/org'), async ({ request }) => {
    await delay(300)
    const auth = authenticate(request)
    if (isAuthError(auth)) return auth
    const forbidden = requirePermission(auth, 'usage.view_org')
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
    const forbidden = requirePermission(auth, 'reports.download', 'Only AI Cost Managers can download reports')
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
