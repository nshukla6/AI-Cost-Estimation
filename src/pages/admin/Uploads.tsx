import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { FormField } from '@/components/generic/FormField'
import { SideSheet } from '@/components/generic/SideSheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/config'
import { costUploadsApi } from '@/lib/api/costUploads.api'
import { vendorsApi } from '@/lib/api/vendors.api'
import type { CostUpload, Vendor } from '@/types/domain'

function uploadHistoryColumns(vendors: Vendor[]): DataTableColumn<CostUpload>[] {
  return [
    { key: 'vendor_id', header: 'Vendor', render: (row) => vendors.find((vendor) => vendor.id === row.vendor_id)?.name ?? `#${row.vendor_id}` },
    { key: 'cost_month', header: 'Month', render: (row) => row.cost_month },
    { key: 'version', header: 'Version', render: (row) => `v${row.version}` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'success' ? 'default' : 'alert'}>{row.status}</Badge>,
    },
    { key: 'uploaded_by', header: 'Uploaded By', render: (row) => row.uploaded_by?.name ?? '—' },
    { key: 'uploaded_at', header: 'Uploaded At', render: (row) => (row.uploaded_at ? new Date(row.uploaded_at).toLocaleString() : '—') },
    { key: 'record_count', header: 'Records', align: 'right', render: (row) => row.record_count ?? '—' },
  ]
}

export function UploadsAdmin() {
  const queryClient = useQueryClient()
  const vendorsQuery = useQuery({ queryKey: ['vendors'], queryFn: () => vendorsApi.getAll() })
  const historyQuery = useQuery({ queryKey: ['cost-uploads'], queryFn: () => costUploadsApi.getHistory() })

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [costMonth, setCostMonth] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // Only shown after the API rejects with 409 REASON_REQUIRED — this vendor/
  // month already has an upload, so a reason is needed before it re-submits
  // as the next version.
  const [needsReason, setNeedsReason] = useState(false)
  const [reason, setReason] = useState('')

  const resetUploadForm = () => {
    setIsUploadOpen(false)
    setVendorId('')
    setCostMonth('')
    setFile(null)
    setNeedsReason(false)
    setReason('')
  }

  const uploadMutation = useMutation({
    mutationFn: () => costUploadsApi.upload({ vendorId: Number(vendorId), costMonth, file: file!, reason: needsReason ? reason : undefined }),
    onSuccess: () => {
      toast.success('Cost sheet uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['cost-uploads'] })
      resetUploadForm()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'REASON_REQUIRED') {
        setNeedsReason(true)
        toast.error('This vendor/month already has an upload — provide a reason to replace it.')
        return
      }
      toast.error(error instanceof ApiError ? error.message : 'Failed to upload cost sheet')
    },
  })

  const handleUploadSubmit = () => {
    if (!vendorId || !costMonth || !file) {
      toast.error('Please fill in all mandatory fields')
      return
    }
    if (needsReason && !reason.trim()) {
      toast.error('A reason is required to replace the existing upload')
      return
    }
    uploadMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Uploads</h1>
          <p className="text-sm text-muted-foreground">Upload and review monthly vendor cost sheets</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover" onClick={() => setIsUploadOpen(true)}>
          <Upload className="size-4" />
          Upload Cost Sheet
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={uploadHistoryColumns(vendorsQuery.data ?? [])}
            data={historyQuery.data ?? []}
            rowKey={(row) => row.id}
            isLoading={historyQuery.isLoading}
          />
        </CardContent>
      </Card>

      <SideSheet
        open={isUploadOpen}
        onOpenChange={(open) => (open ? setIsUploadOpen(true) : resetUploadForm())}
        title="Upload Cost Sheet"
        description="Upload a vendor's monthly cost sheet in CSV format."
        onSubmit={handleUploadSubmit}
        submitLabel={needsReason ? 'Replace Upload' : 'Upload'}
        submittingLabel="Uploading..."
        isSubmitting={uploadMutation.isPending}
        submitDisabled={!vendorId || !costMonth || !file || (needsReason && !reason.trim())}
      >
        <FormField label="Vendor" required>
          <Select
            value={vendorId}
            onValueChange={(value) => {
              setVendorId(value)
              setNeedsReason(false)
              setReason('')
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>
            <SelectContent>
              {(vendorsQuery.data ?? []).map((vendor) => (
                <SelectItem key={vendor.id} value={String(vendor.id)}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Cost Month" required>
          {/* type="month" only lets a month/year be picked (no day) — cost_month
              is always stored as the 1st of the month everywhere downstream
              (allocation queries compare cost_month lexically as a range). */}
          <Input
            type="month"
            value={costMonth.slice(0, 7)}
            onChange={(e) => {
              setCostMonth(e.target.value ? `${e.target.value}-01` : '')
              setNeedsReason(false)
              setReason('')
            }}
          />
        </FormField>

        <FormField label="CSV File" required>
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-muted-foreground">Expected columns: email,amount</p>
        </FormField>

        {needsReason && (
          <FormField label="Reason for replacing this upload" required>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Vendor sent a corrected invoice" />
            <p className="text-xs text-muted-foreground">
              A cost sheet already exists for this vendor and month — submitting again will replace it as the next version.
            </p>
          </FormField>
        )}
      </SideSheet>
    </div>
  )
}
