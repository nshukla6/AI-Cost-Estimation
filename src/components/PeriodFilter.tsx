import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERIOD_OPTIONS, type PeriodGranularity } from '@/lib/period'

interface PeriodFilterProps {
  value: PeriodGranularity
  onChange: (value: PeriodGranularity) => void
}

/** Drives both the data shown on a page and its Download Report range. */
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PeriodGranularity)}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
