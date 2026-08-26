import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/components/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { DEPARTMENTS } from '@/lib/departments'
import { PERMISSIONS } from '@/config/roles.config'
import { Dashboard } from '@/pages/Dashboard'
import { DepartmentDetail } from '@/pages/DepartmentDetail'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { MyUsage } from '@/pages/MyUsage'
import { NotFound } from '@/pages/NotFound'
import { Reports } from '@/pages/Reports'
import { Team } from '@/pages/Team'
import { Unauthorized } from '@/pages/Unauthorized'
import { UploadsAdmin } from '@/pages/admin/Uploads'
import { UsersAdmin } from '@/pages/admin/Users'
import { VendorsAdmin } from '@/pages/admin/Vendors'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />

                <Route element={<ProtectedRoute permission={PERMISSIONS.VIEW_ORG_USAGE} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.VIEW_DEPARTMENT_USAGE} />}>
                  <Route path="/departments" element={<Navigate to={`/departments/${DEPARTMENTS[0].id}`} replace />} />
                  <Route path="/departments/:departmentId" element={<DepartmentDetail />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.VIEW_TEAM_USAGE} />}>
                  <Route path="/team" element={<Team />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.VIEW_OWN_USAGE} />}>
                  <Route path="/my-usage" element={<MyUsage />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.DOWNLOAD_REPORTS} />}>
                  <Route path="/reports" element={<Reports />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.MANAGE_VENDORS} />}>
                  <Route path="/admin/vendors" element={<VendorsAdmin />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.UPLOAD_COST_SHEET} />}>
                  <Route path="/admin/uploads" element={<UploadsAdmin />} />
                </Route>

                <Route element={<ProtectedRoute permission={PERMISSIONS.VIEW_USERS} />}>
                  <Route path="/admin/users" element={<UsersAdmin />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
