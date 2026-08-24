export type PeriodGranularity = 'month' | 'quarter' | 'year'

export interface PeriodRange {
  from: string
  to: string
  label: string
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function monthStart(year: number, monthIndexZeroBased: number): string {
  return `${year}-${String(monthIndexZeroBased + 1).padStart(2, '0')}-01`
}

/**
 * Relative period → concrete { from, to } cost_month bounds, always
 * relative to `reference` (defaults to now). cost_month values are always
 * the 1st of a month, so lexical string comparison against these bounds
 * works the same way it will against real ISO dates from a backend.
 */
export function periodRange(granularity: PeriodGranularity, reference: Date = new Date()): PeriodRange {
  const year = reference.getFullYear()
  const month = reference.getMonth()

  if (granularity === 'month') {
    const from = monthStart(year, month)
    return { from, to: from, label: `${MONTH_NAMES[month]} ${year}` }
  }

  if (granularity === 'quarter') {
    const quarterIndex = Math.floor(month / 3)
    const quarterStartMonth = quarterIndex * 3
    return {
      from: monthStart(year, quarterStartMonth),
      to: monthStart(year, quarterStartMonth + 2),
      label: `Q${quarterIndex + 1} ${year}`,
    }
  }

  return { from: monthStart(year, 0), to: monthStart(year, 11), label: String(year) }
}

export const PERIOD_OPTIONS: { value: PeriodGranularity; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

export interface MonthBucket {
  from: string
  to: string
  shortLabel: string
}

/** Oldest-to-newest single-month buckets, for trend line charts. */
export function lastNMonths(n: number, reference: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - i, 1)
    const from = monthStart(date.getFullYear(), date.getMonth())
    buckets.push({ from, to: from, shortLabel: `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${String(date.getFullYear()).slice(2)}` })
  }
  return buckets
}
