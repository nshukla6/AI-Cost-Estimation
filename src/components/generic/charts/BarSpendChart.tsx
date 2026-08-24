import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

import { CHART_CHROME, SEQUENTIAL_HUE } from '@/lib/chartColors'
import { formatUsd } from '@/lib/format'

export interface BarSpendDatum {
  name: string
  value: number
}

interface BarSpendChartProps {
  data: BarSpendDatum[]
  height?: number
}

function SpendTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-popover-foreground">{formatUsd(Number(payload[0].value))}</p>
    </div>
  )
}

/**
 * Magnitude comparison across categories (not identity) → sequential
 * single hue, per the dataviz skill's form guidance.
 */
export function BarSpendChart({ data, height = 240 }: BarSpendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke={CHART_CHROME.gridline} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(value: number) => `$${Math.round(value).toLocaleString()}`}
        />
        <Tooltip content={SpendTooltip} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="value" fill={SEQUENTIAL_HUE} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
