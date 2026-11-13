import { format, isToday, startOfDay, subDays } from 'date-fns'
import type { ActuatorEvent, History, LogRow, SeriesPoint, Sensors, Status } from './api'

/* ------------------------------------------------------------------ */
/* Sensors                                                             */
/* ------------------------------------------------------------------ */

export type MetricKey = 'temperature' | 'humidity' | 'soil' | 'light'
export type { Range } from './api'

export const METRICS: Record<MetricKey, { label: string; unit: string; color: string; decimals: number }> = {
  temperature: { label: 'Temperature', unit: '°C', color: 'var(--color-temp)', decimals: 1 },
  humidity: { label: 'Air humidity', unit: '%', color: 'var(--color-humid)', decimals: 0 },
  soil: { label: 'Soil moisture', unit: '%', color: 'var(--color-soil)', decimals: 0 },
  light: { label: 'Light level', unit: 'lux', color: 'var(--color-light)', decimals: 0 },
}

export const METRIC_ORDER: MetricKey[] = ['soil', 'temperature', 'humidity', 'light']

/** Frontend metric key -> key used by the API responses. */
export const SENSOR_KEY = {
  soil: 'soilMoisture',
  temperature: 'temperature',
  humidity: 'humidity',
  light: 'light',
} as const satisfies Record<MetricKey, keyof Sensors>

/** "23.4", "1,520", or "—" when there is no reading. */
export function formatValue(metric: MetricKey, v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  if (metric === 'light') return Math.round(v).toLocaleString('en-US')
  return v.toFixed(METRICS[metric].decimals)
}

/* ------------------------------------------------------------------ */
/* Series                                                              */
/* ------------------------------------------------------------------ */

export type Point = { t: Date; v: number }

/** API buckets -> chart points (buckets without a valid value are skipped). */
export function toPoints(series: SeriesPoint[] | undefined): Point[] {
  if (!series) return []
  return series.filter((p) => p.v !== null).map((p) => ({ t: new Date(p.t), v: p.v as number }))
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export type PillTone = 'ok' | 'warn' | 'danger' | 'neutral'

export function pillTone(s: Status | undefined): PillTone {
  if (!s) return 'neutral'
  return s.tone === 'ok' ? 'ok' : s.tone === 'warn' ? 'warn' : s.tone === 'alert' ? 'danger' : 'neutral'
}

/* ------------------------------------------------------------------ */
/* Activity log rows -> timeline items                                 */
/* ------------------------------------------------------------------ */

export type ActivityKind = 'pump' | 'growLight' | 'buzzer' | 'alert' | 'device' | 'settings' | 'auth' | 'system'

export type Activity = { id: string; time: Date; kind: ActivityKind; title: string; detail: string; level: LogRow['level'] }

const KIND: Record<LogRow['source'], ActivityKind> = {
  PUMP: 'pump',
  GROW_LIGHT: 'growLight',
  BUZZER: 'buzzer',
  ALERT: 'alert',
  DEVICE: 'device',
  SETTINGS: 'settings',
  AUTH: 'auth',
  SENSOR: 'system',
  SYSTEM: 'system',
}

/** "Pump ON (auto): Soil moisture 33.4% below 35%" -> title "Pump ON (auto)", detail "Soil moisture 33.4% below 35%". */
export function toActivity(row: LogRow): Activity {
  const i = row.message.indexOf(': ')
  const title = i > 0 && i < 60 ? row.message.slice(0, i) : row.message
  const detail = i > 0 && i < 60 ? row.message.slice(i + 2) : ''
  return { id: String(row.id), time: new Date(row.createdAt), kind: KIND[row.source] ?? 'system', title, detail, level: row.level }
}

/* ------------------------------------------------------------------ */
/* Device runs (pump, grow light, buzzer) from history events          */
/* ------------------------------------------------------------------ */

const endOf = (e: ActuatorEvent, now: Date) => (e.endedAt ? new Date(e.endedAt) : now)
const runSeconds = (e: ActuatorEvent, now: Date) =>
  e.durationSec ?? Math.max(0, (endOf(e, now).getTime() - new Date(e.startedAt).getTime()) / 1000)

/** Litres delivered in a run, estimated from its duration and the pump's flow rate. */
export const litres = (seconds: number, flowLpm: number) => (seconds / 60) * flowLpm

export const fmtLitres = (l: number) => `${l < 10 ? l.toFixed(1) : Math.round(l)} L`

export function pumpRuns(h: History | null) {
  return (h?.events ?? []).filter((e) => e.actuator === 'PUMP')
}

/** Seconds of overlap between [a1, a2] and [b1, b2]. */
function overlapSec(a1: Date, a2: Date, b1: Date, b2: Date) {
  return Math.max(0, (Math.min(a2.getTime(), b2.getTime()) - Math.max(a1.getTime(), b1.getTime())) / 1000)
}

export type DayTotals = { label: string; date: Date; litres: number; pumpRuns: number; growHours: number; alarms: number }

/** Per-day totals for the last `days` local days (oldest first, today last). */
export function dailyTotals(h: History | null, flowLpm: number, days = 7, now = new Date()): DayTotals[] {
  const events = h?.events ?? []
  return Array.from({ length: days }, (_, i) => {
    const date = startOfDay(subDays(now, days - 1 - i))
    const end = new Date(date.getTime() + 86_400_000)
    let pumpSec = 0
    let runs = 0
    let growSec = 0
    let alarms = 0
    for (const e of events) {
      const start = new Date(e.startedAt)
      const inDay = start >= date && start < end
      if (e.actuator === 'PUMP' && inDay) {
        runs++
        pumpSec += runSeconds(e, now)
      } else if (e.actuator === 'GROW_LIGHT') {
        growSec += overlapSec(start, endOf(e, now), date, end)
      } else if (e.actuator === 'BUZZER' && e.source === 'AUTO' && inDay) {
        alarms++
      }
    }
    return {
      label: format(date, 'EEE'),
      date,
      litres: +litres(pumpSec, flowLpm).toFixed(1),
      pumpRuns: runs,
      growHours: +(growSec / 3600).toFixed(1),
      alarms,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

export function hoursMinutes(from: Date, to: Date) {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

/** "14:05" today, "Tue 14:05" otherwise. */
export function shortTime(d: Date | string | null | undefined) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'EEE HH:mm')
}

/** "12s ago", "4 min ago", "3 h ago", "2 d ago". */
export function ago(d: Date | string | null | undefined, now = Date.now()) {
  if (!d) return 'never'
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

/** "~13h from now" / "due now" / "watering now" / "—" */
export function formatNextWatering(n: Sensors['soilMoisture']['nextWatering'] | undefined) {
  if (!n) return '—'
  if (n.state === 'watering') return 'watering now'
  if (n.state === 'due') return 'due now'
  if (n.state === 'steady') return 'not drying'
  if (n.etaSec === null) return '—'
  const h = n.etaSec / 3600
  return h >= 1 ? `~${Math.round(h)}h from now` : `~${Math.max(1, Math.round(n.etaSec / 60))} min from now`
}

/** "HH:MM" -> hour number; "00:00" as an end time means midnight (24). */
export function hourOf(hhmm: string, isEnd = false) {
  const h = Number(hhmm.split(':')[0]) || 0
  return isEnd && h === 0 ? 24 : h
}
