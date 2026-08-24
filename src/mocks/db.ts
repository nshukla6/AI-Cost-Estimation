import type { Role } from '@/config/roles.config'

/**
 * The mock "backend" — a tiny in-browser database persisted to
 * localStorage. Shape mirrors the tables implied by
 * docs/AI_Cost_Tracking_API_Design.docx section 4 (Implied data model).
 *
 * This is dev-only tooling: swap it out (see src/mocks/browser.ts) once a
 * real backend exists behind VITE_API_BASE_URL.
 */

export interface MockDepartment {
  id: number
  name: string
}

export interface MockVendor {
  id: number
  name: string
  is_active: boolean
}

export interface MockUser {
  id: number
  name: string
  email: string
  password: string
  role: Role
  department_id: number
  manager_id: number | null
}

export interface MockCostUpload {
  id: number
  vendor_id: number
  cost_month: string
  version: number
  status: 'success' | 'failed'
  file_name: string
  file_hash: string
  uploaded_by: { id: number; name: string }
  uploaded_at: string
  record_count: number
}

export interface MockCostRecord {
  id: number
  upload_id: number
  user_id: number
  vendor_id: number
  cost_month: string
  amount_usd: number
  deleted: boolean
}

export interface MockDb {
  departments: MockDepartment[]
  vendors: MockVendor[]
  users: MockUser[]
  costUploads: MockCostUpload[]
  costRecords: MockCostRecord[]
  nextId: {
    costUploads: number
    costRecords: number
  }
}

const STORAGE_KEY = 'aice.mockdb.v2'
const DEMO_PASSWORD = 'password123'

const DEPARTMENTS: MockDepartment[] = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Sales' },
  { id: 3, name: 'Marketing' },
  { id: 4, name: 'IT' },
]

const VENDORS: MockVendor[] = [
  { id: 1, name: 'Claude', is_active: true },
  { id: 2, name: 'OpenAI', is_active: true },
  { id: 3, name: 'Lovable', is_active: true },
  { id: 4, name: 'Cursor', is_active: true },
  { id: 5, name: 'Midjourney', is_active: true },
]

// One user per role, plus three department "manager -> reportees" chains so
// /allocation/team has something to show. See docs/DEMO_LOGINS.md.
const USERS: MockUser[] = [
  { id: 1, name: 'Priya Sharma', email: 'priya.sharma@company.com', password: DEMO_PASSWORD, role: 'ai_cost_manager', department_id: 1, manager_id: null },
  { id: 2, name: 'Amit Rao', email: 'amit.rao@company.com', password: DEMO_PASSWORD, role: 'ai_tool_admin', department_id: 4, manager_id: null },
  { id: 3, name: 'Neha Verma', email: 'neha.verma@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 1, manager_id: null },
  { id: 4, name: 'Rahul Khanna', email: 'rahul.khanna@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 1, manager_id: 3 },
  { id: 5, name: 'Ishaan Bose', email: 'ishaan.bose@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 1, manager_id: 3 },
  { id: 6, name: 'Karan Singh', email: 'karan.singh@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 2, manager_id: null },
  { id: 7, name: 'Anita Mehta', email: 'anita.mehta@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 2, manager_id: 6 },
  { id: 8, name: 'Meera Joshi', email: 'meera.joshi@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 2, manager_id: 6 },
  { id: 9, name: 'Vikram Nair', email: 'vikram.nair@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 3, manager_id: null },
  { id: 10, name: 'Sara Iyer', email: 'sara.iyer@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 3, manager_id: 9 },
  { id: 11, name: 'Divya Pillai', email: 'divya.pillai@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 4, manager_id: 2 },
  { id: 12, name: 'Rohan Gupta', email: 'rohan.gupta@company.com', password: DEMO_PASSWORD, role: 'viewer', department_id: 4, manager_id: 2 },
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
  const admin = USERS.find((user) => user.role === 'ai_tool_admin')!

  for (const costMonth of COST_MONTHS) {
    for (const vendor of activeVendors) {
      // Not every user touches every vendor every month.
      const usersOnThisVendor = USERS.filter(() => random() > 0.35)
      if (usersOnThisVendor.length === 0) continue

      const upload: MockCostUpload = {
        id: nextUploadId++,
        vendor_id: vendor.id,
        cost_month: costMonth,
        version: 1,
        status: 'success',
        file_name: `${vendor.name.toLowerCase().replace(/\s+/g, '_')}_${costMonth.slice(0, 7)}_v1.csv`,
        file_hash: `seed-${vendor.id}-${costMonth}-v1`,
        uploaded_by: { id: admin.id, name: admin.name },
        uploaded_at: new Date(`${costMonth}T09:00:00Z`).toISOString(),
        record_count: usersOnThisVendor.length,
      }
      costUploads.push(upload)

      for (const user of usersOnThisVendor) {
        costRecords.push({
          id: nextRecordId++,
          upload_id: upload.id,
          user_id: user.id,
          vendor_id: vendor.id,
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
