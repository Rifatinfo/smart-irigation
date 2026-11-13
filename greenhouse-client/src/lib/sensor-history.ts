import { format } from 'date-fns'
import { SAMPLES, THRESHOLDS, type MetricKey, type Range } from './data'

export const RANGE_LABEL: Record<Range, string> = { '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days' }

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

export function formatAxis(range: Range) {
  return (d: Date) => (range === '24h' ? format(d, 'HH:mm') : range === '7d' ? format(d, 'EEE d') : format(d, 'd MMM'))
}

export function formatTooltip(range: Range) {
  return (d: Date) => (range === '30d' ? `Daily average · ${format(d, 'EEE d MMM')}` : format(d, 'EEE d MMM, HH:mm'))
}

export function chartNote(m: MetricKey, range: Range) {
  if (m === 'soil') return range === '30d' ? 'Daily average moisture' : 'Blue markers are automatic pump runs'
  if (m === 'temperature') return 'Dashed line is the buzzer alarm limit'
  if (m === 'humidity') return `Shaded band is the ${THRESHOLDS.humidityMin}–${THRESHOLDS.humidityMax}% target`
  return range === '24h' ? 'Grow light switches on below the dashed line' : 'Ambient light, before grow light'
}

export function chartThreshold(m: MetricKey, range: Range) {
  if (m === 'soil') return { value: THRESHOLDS.soilOn, label: `Pump on · ${THRESHOLDS.soilOn}%` }
  if (m === 'temperature') return { value: THRESHOLDS.tempAlarm, label: `Buzzer · ${THRESHOLDS.tempAlarm} °C` }
  if (m === 'light' && range === '24h') return { value: THRESHOLDS.lightOn, label: `Grow light · ${THRESHOLDS.lightOn.toLocaleString('en-US')} lux` }
  return undefined
}

/** Share of samples in the range where the metric was outside its target. */
export function outsideShare(m: MetricKey, range: Range) {
  const win = range === '24h' ? SAMPLES.slice(-49) : range === '7d' ? SAMPLES.slice(-336) : SAMPLES
  const test = (s: (typeof SAMPLES)[number]) => {
    if (m === 'soil') return s.soil < THRESHOLDS.soilOn + 3
    if (m === 'temperature') return s.temperature > THRESHOLDS.tempAlarm
    if (m === 'humidity') return s.humidity < THRESHOLDS.humidityMin || s.humidity > THRESHOLDS.humidityMax
    return s.growLight
  }
  const rule =
    m === 'soil' ? `near ${THRESHOLDS.soilOn}%` : m === 'temperature' ? `above ${THRESHOLDS.tempAlarm} °C` : m === 'humidity' ? 'outside band' : 'grow light needed'
  return { pct: (win.filter(test).length / win.length) * 100, rule }
}
