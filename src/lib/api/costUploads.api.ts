import { apiRequest, buildQueryString } from '@/lib/api/config'
import type { CostUpload } from '@/types/domain'

export interface UploadCostSheetParams {
  vendor: string
  costMonth: string
  file: File
  force?: boolean
  /** Required by the API (409 REASON_REQUIRED) when re-uploading a vendor/month that already has data. */
  reason?: string
}

export interface UploadHistoryFilters {
  vendor?: string
  costMonth?: string
}

export interface UploadDiffEntry {
  user_email: string
  user_name: string
  before_usd: number
  after_usd: number
}

export const costUploadsApi = {
  upload: ({ vendor, costMonth, file, force, reason }: UploadCostSheetParams) => {
    const formData = new FormData()
    formData.append('vendor', vendor)
    formData.append('cost_month', costMonth)
    formData.append('file', file)
    if (force) formData.append('force', 'true')
    if (reason) formData.append('reason', reason)

    return apiRequest<CostUpload>('/cost-uploads', {
      method: 'POST',
      body: formData,
    })
  },

  // Phase-2 per API design doc.
  getHistory: ({ vendor, costMonth }: UploadHistoryFilters = {}) =>
    apiRequest<CostUpload[]>(`/cost-uploads${buildQueryString({ vendor, cost_month: costMonth })}`),

  getById: (id: number) => apiRequest<CostUpload>(`/cost-uploads/${id}`),

  getDiff: (id: number, compareToId: number) =>
    apiRequest<UploadDiffEntry[]>(`/cost-uploads/${id}/diff${buildQueryString({ compare_to: compareToId })}`),
}
