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

  const uploadMutation = useMutation({
    mutationFn: () => costUploadsApi.upload({ vendorId: Number(vendorId), costMonth, file: file! }),
    onSuccess: () => {
      toast.success('Cost sheet uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['cost-uploads'] })
      setIsUploadOpen(false)
      setVendorId('')
      setCostMonth('')
      setFile(null)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to upload cost sheet')
    },
  })

  const handleUploadSubmit = () => {
    if (!vendorId || !costMonth || !file) {
      toast.error('Please fill in all mandatory fields')
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
        onOpenChange={setIsUploadOpen}
        title="Upload Cost Sheet"
        description="Upload a vendor's monthly cost sheet in CSV format."
        onSubmit={handleUploadSubmit}
        submitLabel="Upload"
        submittingLabel="Uploading..."
        isSubmitting={uploadMutation.isPending}
        submitDisabled={!vendorId || !costMonth || !file}
      >
        <FormField label="Vendor" required>
          <Select value={vendorId} onValueChange={setVendorId}>
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
          <Input type="date" value={costMonth} onChange={(e) => setCostMonth(e.target.value)} />
        </FormField>

        <FormField label="CSV File" required>
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-muted-foreground">Expected columns: email,amount</p>
        </FormField>
      </SideSheet>
    </div>
  )
}
