import type { Role } from '@/config/roles.config'

/**
 * The mock "backend" — a tiny in-browser database persisted to
 * localStorage. Shape mirrors db/schema.sql (natural keys: vendor code,
 * department_id, user email — no numeric surrogate ids on any of them).
 *
 * This is dev-only tooling: swap it out (see src/mocks/browser.ts) once a
 * real backend exists behind VITE_API_BASE_URL. Roles/permissions are
 * resolved the same way the real Edge Function does it (roles ->
 * role_permissions, unioned) — MOCK_ROLE_PERMISSIONS below is this mock's
 * stand-in for that table, kept in sync by hand.
 */

export interface MockDepartment {
  id: string
  name: string
}

export interface MockVendor {
  code: string
  name: string
  is_active: boolean
}

export interface MockUser {
  email: string
  name: string
  password: string
  roles: Role[]
  department_id: string
  manager_email: string | null
}

export interface MockRole {
  role_code: Role
  role_name: string
  description: string | null
}

export interface MockCostUpload {
  id: number
  vendor: string
  cost_month: string
  version: number
  status: 'success' | 'failed'
  file_name: string
  file_hash: string
  uploaded_by: { email: string; name: string }
  uploaded_at: string
  record_count: number
  reason?: string
}

export interface MockCostRecord {
  id: number
  upload_id: number
  user_email: string
  vendor: string
  cost_month: string
  amount_usd: number
  deleted: boolean
}

export interface MockDb {
  departments: MockDepartment[]
  vendors: MockVendor[]
  users: MockUser[]
  roles: MockRole[]
  costUploads: MockCostUpload[]
  costRecords: MockCostRecord[]
  nextId: {
    costUploads: number
    costRecords: number
  }
}

// Bumped from v3: shape changed from numeric ids to natural keys
// (email/code/department_id) — a stale v3 payload would load with the
// wrong field names and break every handler, so force a fresh reseed.
const STORAGE_KEY = 'aice.mockdb.v4'
const DEMO_PASSWORD = 'password123'

const DEPARTMENTS: MockDepartment[] = [
  { id: 'ENG', name: 'Engineering' },
  { id: 'SALES', name: 'Sales' },
  { id: 'MKT', name: 'Marketing' },
  { id: 'IT', name: 'IT' },
  { id: 'RESEARCH', name: 'Research' },
]

const VENDORS: MockVendor[] = [
  { code: 'CLAUDE', name: 'Claude', is_active: true },
  { code: 'OPENAI', name: 'OpenAI', is_active: true },
  { code: 'LOVABLE', name: 'Lovable', is_active: true },
  { code: 'CURSOR', name: 'Cursor', is_active: true },
  { code: 'MIDJOURNEY', name: 'Midjourney', is_active: true },
]

const ROLES: MockRole[] = [
  { role_code: 'viewer', role_name: 'Viewer', description: 'Can view own and team usage' },
  { role_code: 'ai_cost_manager', role_name: 'AI Cost Manager', description: 'Org-wide dashboard, department reports, report downloads' },
  { role_code: 'ai_tool_admin', role_name: 'AI Tool Admin', description: 'Manage vendors, upload cost sheets, manage user roles' },
]

// Mirrors db/schema.sql's role_permissions seed exactly — keep in sync by
// hand if that seed ever changes.
export const MOCK_ROLE_PERMISSIONS: Record<Role, string[]> = {
  viewer: ['usage.view_own', 'usage.view_team'],
  ai_cost_manager: [
    'usage.view_own',
    'usage.view_team',
    'usage.view_department',
    'usage.view_org',
    'reports.download',
    'vendors.view_upload_history',
    'users.view',
  ],
  ai_tool_admin: [
    'usage.view_own',
    'usage.view_team',
    'usage.view_department',
    'usage.view_org',
    'vendors.upload_cost_sheet',
    'vendors.manage',
    'vendors.view_upload_history',
    'users.view',
    'users.manage_roles',
  ],
}

// One user per role, plus three department "manager -> reportees" chains so
// /allocation/team has something to show. See docs/DEMO_LOGINS.md.
const USERS: MockUser[] = [
  { email: 'priya.sharma@company.com', name: 'Priya Sharma', password: DEMO_PASSWORD, roles: ['ai_cost_manager'], department_id: 'ENG', manager_email: null },
  { email: 'amit.rao@company.com', name: 'Amit Rao', password: DEMO_PASSWORD, roles: ['ai_tool_admin'], department_id: 'IT', manager_email: null },
  { email: 'neha.verma@company.com', name: 'Neha Verma', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'ENG', manager_email: null },
  { email: 'rahul.khanna@company.com', name: 'Rahul Khanna', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'ENG', manager_email: 'neha.verma@company.com' },
  { email: 'ishaan.bose@company.com', name: 'Ishaan Bose', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'ENG', manager_email: 'neha.verma@company.com' },
  { email: 'karan.singh@company.com', name: 'Karan Singh', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'SALES', manager_email: null },
  { email: 'anita.mehta@company.com', name: 'Anita Mehta', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'SALES', manager_email: 'karan.singh@company.com' },
  { email: 'meera.joshi@company.com', name: 'Meera Joshi', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'SALES', manager_email: 'karan.singh@company.com' },
  { email: 'vikram.nair@company.com', name: 'Vikram Nair', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'MKT', manager_email: null },
  { email: 'sara.iyer@company.com', name: 'Sara Iyer', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'MKT', manager_email: 'vikram.nair@company.com' },
  { email: 'divya.pillai@company.com', name: 'Divya Pillai', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'IT', manager_email: 'amit.rao@company.com' },
  { email: 'rohan.gupta@company.com', name: 'Rohan Gupta', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'IT', manager_email: 'amit.rao@company.com' },
  { email: 'farhan.ali@company.com', name: 'Farhan Ali', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'RESEARCH', manager_email: null },
  { email: 'zoya.khan@company.com', name: 'Zoya Khan', password: DEMO_PASSWORD, roles: ['viewer'], department_id: 'RESEARCH', manager_email: 'farhan.ali@company.com' },
]

const COST_MONTHS = ['2026-06-01', '2026-07-01', '2026-08-01']

// Small deterministic PRNG (mulberry32) so the seed looks the same on every
// fresh browser profile instead of reshuffling on every reseed.
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildSeed(): MockDb {
  const costUploads: MockCostUpload[] = []
  const costRecords: MockCostRecord[] = []
  let nextUploadId = 1
  let nextRecordId = 1

  const random = createRandom(42)
  const activeVendors = VENDORS.filter((vendor) => vendor.is_active)
  const admin = USERS.find((user) => user.roles.includes('ai_tool_admin'))!

  for (const costMonth of COST_MONTHS) {
    for (const vendor of activeVendors) {
      // Not every user touches every vendor every month.
      const usersOnThisVendor = USERS.filter(() => random() > 0.35)
      if (usersOnThisVendor.length === 0) continue

      const upload: MockCostUpload = {
        id: nextUploadId++,
        vendor: vendor.code,
        cost_month: costMonth,
        version: 1,
        status: 'success',
        file_name: `${vendor.name.toLowerCase().replace(/\s+/g, '_')}_${costMonth.slice(0, 7)}_v1.csv`,
        file_hash: `seed-${vendor.code}-${costMonth}-v1`,
        uploaded_by: { email: admin.email, name: admin.name },
        uploaded_at: new Date(`${costMonth}T09:00:00Z`).toISOString(),
        record_count: usersOnThisVendor.length,
      }
      costUploads.push(upload)

      for (const user of usersOnThisVendor) {
        costRecords.push({
          id: nextRecordId++,
          upload_id: upload.id,
          user_email: user.email,
          vendor: vendor.code,
          cost_month: costMonth,
          amount_usd: Math.round((5 + random() * 145) * 100) / 100,
          deleted: false,
        })
      }
    }
  }

  return {
    departments: DEPARTMENTS,
    vendors: VENDORS,
    users: USERS,
    roles: ROLES,
    costUploads,
    costRecords,
    nextId: { costUploads: nextUploadId, costRecords: nextRecordId },
  }
}

export function loadDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as MockDb
    } catch {
      // fall through and reseed a corrupted store
    }
  }
  const seeded = buildSeed()
  saveDb(seeded)
  return seeded
}

export function saveDb(db: MockDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function resetMockDb(): MockDb {
  localStorage.removeItem(STORAGE_KEY)
  return loadDb()
}
