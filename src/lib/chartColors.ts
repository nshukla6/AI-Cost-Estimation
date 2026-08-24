/**
 * Chart color tokens — see the dataviz skill's `references/palette.md` for
 * the source. Light-theme only (this app doesn't ship dark mode).
 *
 * Fixed categorical order, validated for this app's actual use (5 vendor
 * slots, adjacent-pairs check — a pie's slices only ever neighbor two
 * others, same as a stacked bar, not an all-pairs scatter):
 *   node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4" --mode light
 *   → ALL CHECKS PASS (worst adjacent CVD ΔE 9.1, target ≥8)
 */
export const CATEGORICAL_PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

/** Single hue for magnitude comparisons (bar charts comparing one measure across categories). */
export const SEQUENTIAL_HUE = '#2a78d6'

// Fixed order matching the vendor seed in src/mocks/db.ts — vendor identity
// is reused across charts (Dashboard pie, Department pie), so the mapping
// must be stable by name, not by array position in any one query's result.
const VENDOR_ORDER = ['Claude', 'OpenAI', 'Lovable', 'Cursor', 'Midjourney']

export function getVendorColor(vendorName: string): string {
  const index = VENDOR_ORDER.indexOf(vendorName)
  return CATEGORICAL_PALETTE[index >= 0 ? index : CATEGORICAL_PALETTE.length - 1]
}

export const CHART_CHROME = {
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  mutedText: '#898781',
  secondaryText: '#52514e',
}
