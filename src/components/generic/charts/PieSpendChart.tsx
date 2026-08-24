import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

import { formatUsd } from '@/lib/format'

export interface PieSpendDatum {
  name: string
  value: number
  color: string
}

interface PieSpendChartProps {
  data: PieSpendDatum[]
  height?: number
}

function SpendTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.payload?.color }} />
      <span className="text-muted-foreground">{entry.name}</span>
      <span className="font-semibold text-popover-foreground">{formatUsd(Number(entry.value))}</span>
    </div>
  )
}

/**
 * Part-to-whole by vendor identity → categorical color, one fixed slot per
 * vendor (see src/lib/chartColors.ts) so the mapping stays the same across
 * every chart it appears in. Animation is off — Recharts' pie sweep-in
 * takes noticeably longer to commit than bar/line in this version, and a
 * dashboard shouldn't replay a growth animation on every refetch anyway.
 */
export function PieSpendChart({ data, height = 240 }: PieSpendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={SpendTooltip} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}
