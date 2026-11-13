import { format, startOfDay, subMinutes, isSameDay, subDays } from 'date-fns'

/* ------------------------------------------------------------------ */
/* Sensors and thresholds                                              */
/* ------------------------------------------------------------------ */

export type MetricKey = 'temperature' | 'humidity' | 'soil' | 'light'
export type Range = '24h' | '7d' | '30d'

export const METRICS: Record<
  MetricKey,
  { label: string; unit: string; color: string; decimals: number; sensor: string; pin: string }
> = {
  temperature: { label: 'Temperature', unit: '°C', color: 'var(--color-temp)', decimals: 1, sensor: 'DHT22', pin: 'GPIO 4' },
  humidity: { label: 'Air humidity', unit: '%', color: 'var(--color-humid)', decimals: 0, sensor: 'DHT22', pin: 'GPIO 4' },
  soil: { label: 'Soil moisture', unit: '%', color: 'var(--color-soil)', decimals: 0, sensor: 'Capacitive v2.0', pin: 'A0' },
  light: { label: 'Light level', unit: 'lux', color: 'var(--color-light)', decimals: 0, sensor: 'BH1750', pin: 'I²C 0x23' },
}

export const METRIC_ORDER: MetricKey[] = ['soil', 'temperature', 'humidity', 'light']

export const THRESHOLDS = {
  soilOn: 35,
  soilOff: 62,
  lightOn: 1500,
  photoStart: 6,
  photoEnd: 22,
  tempAlarm: 32,
  humidityMin: 45,
  humidityMax: 80,
}

export const NOW = new Date(2025, 5, 14, 20, 0)

export function formatValue(metric: MetricKey, v: number) {
  const d = METRICS[metric].decimals
  if (metric === 'light') return Math.round(v).toLocaleString('en-US')
  return v.toFixed(d)
}

/* ------------------------------------------------------------------ */
/* Simulated 30 days of controller samples, every 30 minutes           */
/* ------------------------------------------------------------------ */

export type Sample = {
  time: Date
  temperature: number
  humidity: number
  soil: number
  light: number
  pump: boolean
  growLight: boolean
  buzzer: boolean
}

const DAYS = 30
const STEPS = DAYS * 48

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export const SAMPLES: Sample[] = (() => {
  const rand = rng(42)
  const n = () => rand() - 0.5
  const clouds = Array.from({ length: DAYS + 1 }, (_, i) => (i === DAYS ? 1 : 0.55 + rand() * 0.45))
  const out: Sample[] = []
  const first = subMinutes(NOW, (STEPS - 1) * 30)
  const firstDay = startOfDay(first).getTime()
  let soil = 52
  let sincePump = 99
  for (let k = 0; k < STEPS; k++) {
    const time = subMinutes(NOW, (STEPS - 1 - k) * 30)
    const h = time.getHours() + time.getMinutes() / 60
    const day = Math.min(DAYS, Math.round((startOfDay(time).getTime() - firstDay) / 86400000))
    const cloud = clouds[day]
    const sun = h >= 6 && h <= 20 ? Math.sin((Math.PI * (h - 6)) / 14) : 0
    const light = Math.max(18, sun * 26000 * cloud + n() * 700 * sun + 30 + n() * 20)
    const warm = Math.max(0, Math.sin((Math.PI * (h - 7)) / 15))
    const temperature = 18.5 + 14.4 * (0.5 + 0.5 * cloud) * Math.pow(warm, 1.2) + n() * 0.6
    soil -= sun > 0 ? 0.3 + (temperature - 18) * 0.06 + n() * 0.1 : 0.17 + n() * 0.05
    sincePump++
    let pump = false
    if (soil < THRESHOLDS.soilOn) pump = true
    const humidity = 84 - (temperature - 18) * 1.8 + (sincePump < 3 ? 4 : 0) + n() * 1.5
    out.push({
      time,
      temperature,
      humidity,
      soil: Math.max(0, soil),
      light,
      pump,
      growLight: light < THRESHOLDS.lightOn && h >= THRESHOLDS.photoStart && h < THRESHOLDS.photoEnd,
      buzzer: temperature > THRESHOLDS.tempAlarm,
    })
    if (pump) {
      soil = THRESHOLDS.soilOff + n()
      sincePump = 0
    }
  }
  return out
})()

export const CURRENT = SAMPLES[SAMPLES.length - 1]

/* ------------------------------------------------------------------ */
/* Series and statistics                                               */
/* ------------------------------------------------------------------ */

export type Point = { t: Date; v: number }

function windowFor(range: Range) {
  if (range === '24h') return SAMPLES.slice(-49)
  if (range === '7d') return SAMPLES.slice(-7 * 48)
  return SAMPLES
}

export function seriesFor(metric: MetricKey, range: Range): Point[] {
  const win = windowFor(range)
  if (range === '24h') return win.map((s) => ({ t: s.time, v: s[metric] }))
  if (range === '7d') return win.filter((_, i) => i % 4 === 0).map((s) => ({ t: s.time, v: s[metric] }))
  const days: Point[] = []
  for (let d = DAYS - 1; d >= 0; d--) {
    const day = subDays(NOW, d)
    const inDay = SAMPLES.filter((s) => isSameDay(s.time, day))
    if (!inDay.length) continue
    days.push({ t: startOfDay(day), v: inDay.reduce((a, s) => a + s[metric], 0) / inDay.length })
  }
  return days
}

export function statsFor(metric: MetricKey, range: Range) {
  const vals = windowFor(range).map((s) => s[metric])
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return { min, max, avg }
}

export function trendFor(metric: MetricKey) {
  const now = SAMPLES[SAMPLES.length - 1][metric]
  const prev = SAMPLES[SAMPLES.length - 3][metric]
  return now - prev
}

/* ------------------------------------------------------------------ */
/* Device activity derived from the samples                            */
/* ------------------------------------------------------------------ */

export type PumpRun = { time: Date; before: number; after: number; liters: number; seconds: number }

export const PUMP_RUNS: PumpRun[] = SAMPLES.flatMap((s) => {
  if (!s.pump) return []
  const after = THRESHOLDS.soilOff
  const liters = +((after - s.soil) * 0.12).toFixed(1)
  return [{ time: s.time, before: s.soil, after, liters, seconds: Math.round(liters * 29) }]
})

type Interval = { start: Date; end: Date | null; peak: number }

function intervals(key: 'growLight' | 'buzzer', peakOf: (s: Sample) => number): Interval[] {
  const out: Interval[] = []
  let cur: Interval | null = null
  for (const s of SAMPLES) {
    if (s[key]) {
      if (!cur) cur = { start: s.time, end: null, peak: peakOf(s) }
      else cur.peak = Math.max(cur.peak, peakOf(s))
    } else if (cur) {
      cur.end = s.time
      out.push(cur)
      cur = null
    }
  }
  if (cur) out.push(cur)
  return out
}

export const GROW_LIGHT_SESSIONS = intervals('growLight', (s) => -s.light)
export const BUZZER_ALARMS = intervals('buzzer', (s) => s.temperature)

export const LAST_PUMP = PUMP_RUNS[PUMP_RUNS.length - 1]
export const CURRENT_GROW = GROW_LIGHT_SESSIONS.find((g) => g.end === null) ?? null

export function dailyWater(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const day = subDays(NOW, days - 1 - i)
    const runs = PUMP_RUNS.filter((r) => isSameDay(r.time, day))
    return {
      label: format(day, 'EEE'),
      date: day,
      liters: +runs.reduce((a, r) => a + r.liters, 0).toFixed(1),
      runs: runs.length,
    }
  })
}

export function dailyGrowHours(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const day = subDays(NOW, days - 1 - i)
    const steps = SAMPLES.filter((s) => isSameDay(s.time, day) && s.growLight).length
    return { label: format(day, 'EEE'), date: day, hours: steps / 2 }
  })
}

export const TODAY = {
  water: +PUMP_RUNS.filter((r) => isSameDay(r.time, NOW)).reduce((a, r) => a + r.liters, 0).toFixed(1),
  pumpRuns: PUMP_RUNS.filter((r) => isSameDay(r.time, NOW)).length,
  growHours: SAMPLES.filter((s) => isSameDay(s.time, NOW) && s.growLight).length / 2,
  alarms: BUZZER_ALARMS.filter((a) => isSameDay(a.start, NOW)).length,
}

/* ------------------------------------------------------------------ */
/* Activity log and alerts                                             */
/* ------------------------------------------------------------------ */

export type ActivityKind = 'pump' | 'growLight' | 'buzzer' | 'system'

export type Activity = { id: string; time: Date; kind: ActivityKind; title: string; detail: string }

export const ACTIVITY: Activity[] = [
  ...PUMP_RUNS.map((r, i) => ({
    id: `p${i}`,
    time: r.time,
    kind: 'pump' as const,
    title: 'Water pump ran automatically',
    detail: `Soil at ${Math.round(r.before)}% → watered ${r.liters} L over ${r.seconds}s, back to ${r.after}%`,
  })),
  ...GROW_LIGHT_SESSIONS.flatMap((g, i) => [
    {
      id: `g${i}on`,
      time: g.start,
      kind: 'growLight' as const,
      title: 'Grow light switched on',
      detail: `Ambient light fell below ${THRESHOLDS.lightOn.toLocaleString('en-US')} lux`,
    },
    ...(g.end
      ? [
          {
            id: `g${i}off`,
            time: g.end,
            kind: 'growLight' as const,
            title: 'Grow light switched off',
            detail:
              g.end.getHours() >= THRESHOLDS.photoEnd || g.end.getHours() < THRESHOLDS.photoStart
                ? 'Photoperiod ended (22:00)'
                : 'Daylight recovered above threshold',
          },
        ]
      : []),
  ]),
  ...BUZZER_ALARMS.map((b, i) => ({
    id: `b${i}`,
    time: b.start,
    kind: 'buzzer' as const,
    title: 'Heat alarm — buzzer activated',
    detail: `Temperature peaked at ${b.peak.toFixed(1)} °C${b.end ? `, cleared at ${format(b.end, 'HH:mm')}` : ''}`,
  })),
  { id: 's1', time: subMinutes(NOW, 2), kind: 'system' as const, title: 'Readings synced to cloud', detail: '48 samples uploaded to ThingSpeak channel 2381904' },
  { id: 's2', time: subMinutes(NOW, 6 * 60 + 15), kind: 'system' as const, title: 'Controller reconnected', detail: 'Wi-Fi signal restored after 3 min (RSSI −61 dBm)' },
  { id: 's3', time: subDays(NOW, 2), kind: 'system' as const, title: 'Soil sensor calibrated', detail: 'Dry 812 / wet 391 raw values saved' },
].sort((a, b) => b.time.getTime() - a.time.getTime())

export type Severity = 'critical' | 'warning' | 'info'

export type Alert = {
  id: string
  time: Date
  severity: Severity
  title: string
  detail: string
  source: string
  resolved: boolean
  resolution: string
}

export const ALERTS: Alert[] = [
  ...BUZZER_ALARMS.map((b, i) => ({
    id: `heat${i}`,
    time: b.start,
    severity: 'critical' as const,
    title: `High temperature: ${b.peak.toFixed(1)} °C`,
    detail: `Exceeded the ${THRESHOLDS.tempAlarm} °C limit. Buzzer sounded until the air cooled.`,
    source: 'DHT22 · Temperature',
    resolved: b.end !== null,
    resolution: b.end ? `Cleared at ${format(b.end, 'HH:mm')}` : 'Ongoing',
  })),
  ...PUMP_RUNS.map((r, i) => ({
    id: `dry${i}`,
    time: r.time,
    severity: 'warning' as const,
    title: `Soil dry: ${Math.round(r.before)}%`,
    detail: `Fell below the ${THRESHOLDS.soilOn}% watering threshold.`,
    source: 'Capacitive · Soil moisture',
    resolved: true,
    resolution: `Pump watered ${r.liters} L automatically`,
  })),
  {
    id: 'net1',
    time: subMinutes(NOW, 6 * 60 + 18),
    severity: 'info' as const,
    title: 'Controller went offline',
    detail: 'No data received for 3 minutes. Readings were buffered and uploaded on reconnect.',
    source: 'ESP32 · Network',
    resolved: true,
    resolution: 'Reconnected automatically',
  },
].sort((a, b) => b.time.getTime() - a.time.getTime())

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function metricStatus(metric: MetricKey, v: number): { tone: 'ok' | 'warn' | 'danger'; text: string } {
  if (metric === 'temperature') {
    if (v > THRESHOLDS.tempAlarm) return { tone: 'danger', text: 'Too hot' }
    if (v > THRESHOLDS.tempAlarm - 2) return { tone: 'warn', text: 'Warm' }
    return { tone: 'ok', text: 'Optimal' }
  }
  if (metric === 'humidity') {
    if (v < THRESHOLDS.humidityMin) return { tone: 'warn', text: 'Dry air' }
    if (v > THRESHOLDS.humidityMax) return { tone: 'warn', text: 'Humid' }
    return { tone: 'ok', text: 'Optimal' }
  }
  if (metric === 'soil') {
    if (v < THRESHOLDS.soilOn) return { tone: 'danger', text: 'Dry' }
    if (v < THRESHOLDS.soilOn + 7) return { tone: 'warn', text: 'Drying' }
    return { tone: 'ok', text: 'Moist' }
  }
  const h = NOW.getHours()
  if (v < THRESHOLDS.lightOn && h >= THRESHOLDS.photoStart && h < THRESHOLDS.photoEnd) return { tone: 'warn', text: 'Low light' }
  return { tone: 'ok', text: v < THRESHOLDS.lightOn ? 'Night' : 'Bright' }
}

export function hoursMinutes(from: Date, to: Date) {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}
