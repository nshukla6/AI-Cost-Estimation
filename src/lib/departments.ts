export interface DepartmentSummary {
  id: string
  name: string
}

// Placeholder until a GET /departments endpoint exists — matches the
// departments seeded in db/schema.sql (department_id is a real business
// code now, e.g. 'ENG', not a numeric id).
export const DEPARTMENTS: DepartmentSummary[] = [
  { id: 'ENG', name: 'Engineering' },
  { id: 'SALES', name: 'Sales' },
  { id: 'MKT', name: 'Marketing' },
  { id: 'IT', name: 'IT' },
  { id: 'RESEARCH', name: 'Research' },
]
