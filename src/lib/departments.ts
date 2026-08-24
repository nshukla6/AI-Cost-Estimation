export interface DepartmentSummary {
  id: number
  name: string
}

// Placeholder until a GET /departments endpoint exists — matches the mock
// backend's seed data (src/mocks/db.ts) and the API design doc's example
// (department_id 2 = "Engineering" — ids here are just kept self-consistent
// with the mock).
export const DEPARTMENTS: DepartmentSummary[] = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Sales' },
  { id: 3, name: 'Marketing' },
  { id: 4, name: 'IT' },
]
