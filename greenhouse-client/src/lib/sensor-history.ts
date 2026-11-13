import { format } from 'date-fns'
import type { History } from './api'
import type { MetricKey, Range } from './data'

export const RANGE_LABEL: Record<Range, string> = { '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days' }

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

/** Bucket size the server uses for each range (24 h → 15 min, 7 d → 1 h, 30 d → 6 h). */
export const BUCKET_LABEL: Record<Range, string> = { '24h': '15-minute', '7d': 'hourly', '30d': '6-hour' }

export function formatAxis(range: Range) {
  return (d: Date) => (range === '24h' ? format(d, 'HH:mm') : range === '7d' ? format(d, 'EEE d') : format(d, 'd MMM'))
}

export function formatTooltip(range: Range) {
  return (d: Date) => `${format(d, 'EEE d MMM, HH:mm')} · ${BUCKET_LABEL[range]} avg`
}

export function chartNote(m: MetricKey, range: Range, t: History['thresholds'] | undefined) {
  if (m === 'soil') return range === '30d' ? '6-hour average moisture' : 'Blue markers are pump runs'
  if (m === 'temperature') return 'Dashed line is the buzzer alarm limit'
  if (m === 'humidity') return t ? `Shaded band is the ${t.humidityMin}–${t.humidityMax}% target` : 'Relative humidity'
  return 'Grow light switches on below the dashed line'
}

export function chartThreshold(m: MetricKey, t: History['thresholds'] | undefined) {
  if (!t) return undefined
  if (m === 'soil') return { value: t.soilDry, label: `Pump on · ${t.soilDry}%` }
  if (m === 'temperature') return { value: t.tempAlarm, label: `Buzzer · ${t.tempAlarm} °C` }
  if (m === 'light') return { value: t.lightOn, label: `Grow light · ${t.lightOn.toLocaleString('en-US')} lux` }
  return undefined
}
