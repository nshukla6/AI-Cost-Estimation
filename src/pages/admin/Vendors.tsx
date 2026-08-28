import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type DataTableColumn } from '@/components/generic/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { vendorsApi } from '@/lib/api/vendors.api'
import type { Vendor } from '@/types/domain'

const vendorColumns: DataTableColumn<Vendor>[] = [
  { key: 'name', header: 'Vendor', render: (row) => row.name },
  {
    key: 'is_active',
    header: 'Active',
    render: (row) => <VendorActiveToggle vendor={row} />,
  },
]

function VendorActiveToggle({ vendor }: { vendor: Vendor }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (isActive: boolean) => vendorsApi.setActive(vendor.code, isActive),
    onSuccess: () => {
      toast.success(`${vendor.name} ${vendor.is_active ? 'disabled' : 'enabled'}`)
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: () => toast.error('Failed to update vendor'),
  })

  return (
    <Checkbox
      checked={vendor.is_active}
      onCheckedChange={(checked) => mutation.mutate(checked === true)}
      className="data-checked:bg-primary data-checked:border-primary"
    />
  )
}

export function VendorsAdmin() {
  const vendorsQuery = useQuery({ queryKey: ['vendors'], queryFn: () => vendorsApi.getAll() })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendors</h1>
        <p className="text-sm text-muted-foreground">Enable or disable AI vendors</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={vendorColumns} data={vendorsQuery.data ?? []} rowKey={(row) => row.code} isLoading={vendorsQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
