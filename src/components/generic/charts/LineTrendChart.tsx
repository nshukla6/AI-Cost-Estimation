import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

import { CHART_CHROME, SEQUENTIAL_HUE } from '@/lib/chartColors'
import { formatUsd } from '@/lib/format'

export interface LineTrendDatum {
  name: string
  value: number
}

interface LineTrendChartProps {
  data: LineTrendDatum[]
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
 * A single trend series → one hue, no legend box (the card title already
 * says what's plotted).
 */
export function LineTrendChart({ data, height = 240 }: LineTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke={CHART_CHROME.gridline} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(value: number) => `$${Math.round(value).toLocaleString()}`}
        />
        <Tooltip content={SpendTooltip} cursor={{ stroke: CHART_CHROME.axis, strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={SEQUENTIAL_HUE}
          strokeWidth={2}
          dot={{ r: 4, fill: SEQUENTIAL_HUE }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
