# Demo Logins

Dummy accounts seeded into the mock backend (`src/mocks/db.ts`) for local
development. Data lives in the browser's `localStorage` — see
[MOCK_BACKEND.md](./MOCK_BACKEND.md) for how the mock works and how to
reset it. **These are not real credentials** — swap the mock out for a
real backend before shipping (see that same doc).

All accounts share the password **`password123`**.

| Role | Name | Email | Notes |
| --- | --- | --- | --- |
| AI Cost Manager | Priya Sharma | `priya.sharma@company.com` | Org-wide dashboard, department reports, report downloads |
| AI Tool Admin | Amit Rao | `amit.rao@company.com` | Manage vendors, upload cost sheets, manage user roles; also manages 2 reports (Divya, Rohan) |
| Viewer (manager) | Neha Verma | `neha.verma@company.com` | Engineering — manages Rahul Khanna, Ishaan Bose |
| Viewer (reportee) | Rahul Khanna | `rahul.khanna@company.com` | Engineering — reports to Neha |
| Viewer (reportee) | Ishaan Bose | `ishaan.bose@company.com` | Engineering — reports to Neha |
| Viewer (manager) | Karan Singh | `karan.singh@company.com` | Sales — manages Anita Mehta, Meera Joshi |
| Viewer (reportee) | Anita Mehta | `anita.mehta@company.com` | Sales — reports to Karan |
| Viewer (reportee) | Meera Joshi | `meera.joshi@company.com` | Sales — reports to Karan |
| Viewer (manager) | Vikram Nair | `vikram.nair@company.com` | Marketing — manages Sara Iyer |
| Viewer (reportee) | Sara Iyer | `sara.iyer@company.com` | Marketing — reports to Vikram |
| Viewer (reportee) | Divya Pillai | `divya.pillai@company.com` | IT — reports to Amit Rao |
| Viewer (reportee) | Rohan Gupta | `rohan.gupta@company.com` | IT — reports to Amit Rao |
| Viewer (manager) | Farhan Ali | `farhan.ali@company.com` | Research — manages Zoya Khan |
| Viewer (reportee) | Zoya Khan | `zoya.khan@company.com` | Research — reports to Farhan |

Use Neha, Karan, Vikram, Farhan, or Amit to see the **My Team** screen populated;
use any reportee to see **My Usage** with an empty team view.
