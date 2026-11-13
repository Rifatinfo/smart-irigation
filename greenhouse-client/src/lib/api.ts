/**
 * Typed client for the greenhouse-server API (Express + PostgreSQL).
 * Auth uses the httpOnly cookies set by POST /auth/login (fetch with credentials: 'include').
 *
 * Backend address: NEXT_PUBLIC_API_URL, or — when it is not set — the same host the dashboard
 * was opened from on port 5000 (so http://192.168.0.10:3000 talks to http://192.168.0.10:5000).
 */

export function apiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:5000`
  return 'http://localhost:5000'
}

// ── types (mirror the backend responses) ──────────────────────────────────
export type Tone = 'ok' | 'warn' | 'alert' | 'unknown'
export type Status = { code: string; label: string; tone: Tone }
export type SeriesPoint = { t: string; v: number | null; min: number | null; max: number | null }
export type Range = '24h' | '7d' | '30d'

type SensorBase = {
  label: string
  sensor: string
  unit: string
  value: number | null
  status: Status
  high24h: number | null
  low24h: number | null
  lastHourDelta: number | null
  series: SeriesPoint[]
}

export type NextWatering = {
  etaSec: number | null
  estimatedAt: string | null
  state: 'trend' | 'due' | 'watering' | 'steady' | 'unknown'
}

export type Sensors = {
  soilMoisture: SensorBase & { raw: number | null; pumpStartsBelow: number; pumpStopsAt: number; nextWatering: NextWatering }
  temperature: SensorBase & { buzzerSoundsAbove: number }
  humidity: SensorBase & { healthyRange: { min: number; max: number } }
  light: SensorBase & { growLightBelow: number }
}

export type Device = {
  id: string
  name: string
  isOnline: boolean
  lastSeenAt: string | null
  firmwareVersion: string | null
  ipAddress: string | null
  rssi: number | null
  apiKeyPrefix: string
  createdAt: string
  hardware: { soil: string; temperature: string; humidity: string; light: string }
}

export type ActuatorType = 'PUMP' | 'GROW_LIGHT' | 'BUZZER'
export type ControlMode = 'AUTO' | 'ON' | 'OFF'

export type Actuator = {
  actuator: ActuatorType
  mode: ControlMode
  isOn: boolean
  desiredOn: boolean
  reportedOn: boolean | null
  reason: string | null
  manualUntil: string | null
  lastChangedAt: string | null
  lastOnAt: string | null
  lastOffAt: string | null
}
export type Actuators = { pump: Actuator | null; growLight: Actuator | null; buzzer: Actuator | null }

export type AlertType =
  | 'HIGH_TEMPERATURE'
  | 'DEVICE_OFFLINE'
  | 'SENSOR_FAULT'
  | 'PUMP_INEFFECTIVE'
  | 'SOIL_DRY'
  | 'HUMIDITY_OUT_OF_RANGE'
  | 'LOW_TEMPERATURE'

export type Alert = {
  id: string
  deviceId: string
  type: AlertType
  dedupeKey: string
  severity: 'WARNING' | 'CRITICAL'
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  title: string
  message: string
  value: number | null
  threshold: number | null
  openedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

export type LogLevel = 'INFO' | 'WARNING' | 'CRITICAL'
export type LogSource = 'SENSOR' | 'PUMP' | 'GROW_LIGHT' | 'BUZZER' | 'DEVICE' | 'SETTINGS' | 'ALERT' | 'AUTH' | 'SYSTEM'
export type LogRow = {
  id: number
  deviceId: string | null
  level: LogLevel
  source: LogSource
  message: string
  meta: unknown
  createdAt: string
}

export type Summary = {
  device: Device
  updatedAt: string | null
  hasData: boolean
  sensors: Sensors
  actuators: Actuators
  alerts: { activeCount: number; items: Alert[] }
  recentLogs: LogRow[]
  serverTime: string
}

export type Stat = {
  now: number | null
  min: number | null
  average: number | null
  max: number | null
  samples: number
  outsidePct: number
  outsideLabel: string
}

export type ActuatorEvent = {
  id: number
  actuator: ActuatorType
  source: 'AUTO' | 'MANUAL' | 'SAFETY' | 'SYSTEM'
  reason: string | null
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  soilBefore: number | null
  soilAfter: number | null
  endReason: string | null
}

export type History = {
  range: { key: string; from: string; to: string; bucketSec: number }
  thresholds: { soilDry: number; soilWetTarget: number; tempAlarm: number; humidityMin: number; humidityMax: number; lightOn: number }
  stats: { soilMoisture: Stat; temperature: Stat; humidity: Stat; light: Stat }
  series: { soilMoisture: SeriesPoint[]; temperature: SeriesPoint[]; humidity: SeriesPoint[]; light: SeriesPoint[] }
  events: ActuatorEvent[]
  totals: { samples: number; pumpRuns: number; pumpSeconds: number; growLightSeconds: number; buzzerAlarms: number }
}

export type Settings = {
  soilDryThreshold: number
  soilWetTarget: number
  pumpMaxRunSec: number
  pumpMinIntervalMin: number
  soilRawDry: number
  soilRawWet: number
  pumpFlowLpm: number
  tempAlarmThreshold: number
  tempAlarmHysteresis: number
  tempLowThreshold: number
  humidityMin: number
  humidityMax: number
  lightOnThreshold: number
  lightHysteresisPct: number
  growLightMinSwitchSec: number
  growLightScheduleEnabled: boolean
  growLightStart: string
  growLightEnd: string
  timezone: string
  readingIntervalSec: number
  offlineAfterSec: number
  dataRetentionDays: number
  updatedAt: string
}
export type SettingsPatch = Partial<Omit<Settings, 'updatedAt'>>

export type User = { id: string; email: string | null; name: string | null; role: string; needPasswordChange: boolean }

export type Paged<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }

export type ReadingEvent = {
  at: string
  deviceId: string
  values: { soilMoisture: number | null; temperature: number | null; humidity: number | null; light: number | null }
  statuses: { soilMoisture: Status; temperature: Status; humidity: Status; light: Status }
  actuators: Actuators
  device: Device
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Array<{ path?: string; message?: string }>,
  ) {
    super(message)
  }
}

// ── core request: auto-refreshes the access token once on 401 ─────────────
let refreshing: Promise<boolean> | null = null
function refreshToken(): Promise<boolean> {
  refreshing ??= fetch(`${apiUrl()}/api/v1/auth/refresh-token`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0))
  return refreshing
}

async function raw(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${apiUrl()}/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(0, `Cannot reach the greenhouse server at ${apiUrl()}. Is it running?`)
  }
  if (res.status === 401 && !retried && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (await refreshToken()) return raw(path, init, true)
  }
  return res
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const res = await raw(path, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    const details = Array.isArray(body.error) ? body.error : undefined
    throw new ApiError(res.status, body.message || res.statusText || 'Request failed', details)
  }
  return { data: body.data as T, meta: body.meta ?? null }
}

const get = async <T,>(path: string) => (await request<T>(path)).data
const send = async <T,>(method: string, path: string, body?: unknown) =>
  (await request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })).data

const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ── API ────────────────────────────────────────────────────────────────
export const api = {
  login: (email: string, password: string, remember: boolean) =>
    send<{ user: User; needPasswordChange: boolean; accessToken: string }>('POST', '/auth/login', { email, password, remember }),
  loginWithGoogle: (accessToken: string, remember: boolean) =>
    send<{ user: User; needPasswordChange: boolean; accessToken: string }>('POST', '/auth/google', { accessToken, remember }),
  /** Public: which sign-in methods the server offers (googleClientId null = Google sign-in off). */
  authConfig: () => get<{ googleClientId: string | null }>('/auth/config'),
  logout: () => send('POST', '/auth/logout'),
  me: () => get<User>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) => send('POST', '/auth/change-password', { oldPassword, newPassword }),

  summary: (withSeries = true) => get<Summary>(`/dashboard/summary${withSeries ? '' : '?series=false'}`),
  history: (range: Range) => get<History>(`/history${qs({ range })}`),
  csvUrl: (range: Range) => `${apiUrl()}/api/v1/history/export.csv${qs({ range })}`,
  async downloadCsv(range: Range) {
    const res = await raw(`/history/export.csv${qs({ range })}`)
    if (!res.ok) throw new ApiError(res.status, 'Export failed')
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? `greenhouse-${range}.csv`
    return { blob: await res.blob(), name }
  },

  settings: () => get<Settings>('/settings'),
  saveSettings: (patch: SettingsPatch) => send<Settings>('PATCH', '/settings', patch),

  control: (device: 'pump' | 'grow-light' | 'buzzer', mode: ControlMode, durationSec?: number) =>
    send<Actuators>('POST', `/control/${device}`, { mode, durationSec }),

  async alerts(status: 'active' | 'resolved' | 'all' = 'active', page = 1, limit = 20): Promise<Paged<Alert>> {
    const r = await request<Alert[]>(`/alerts${qs({ status, page, limit })}`)
    return { items: r.data, meta: r.meta as Paged<Alert>['meta'] }
  },
  acknowledge: (id: string) => send<Alert>('POST', `/alerts/${id}/acknowledge`),
  acknowledgeAll: () => send<{ count: number }>('POST', '/alerts/acknowledge-all'),

  async logs(params: { page?: number; limit?: number; level?: LogLevel; source?: LogSource; q?: string } = {}): Promise<Paged<LogRow>> {
    const r = await request<LogRow[]>(`/logs${qs(params)}`)
    return { items: r.data, meta: r.meta as Paged<LogRow>['meta'] }
  },

  renameDevice: (id: string, name: string) => send<Device>('PATCH', `/devices/${id}`, { name }),
  rotateKey: (id: string) => send<Device & { apiKey: string }>('POST', `/devices/${id}/rotate-key`),

  streamUrl: () => `${apiUrl()}/api/v1/stream`,
}

/** First server-side validation message, for showing under a form. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const first = e.details?.find((d) => d.message)?.message
    return first && first !== e.message ? `${e.message}: ${first}` : e.message
  }
  return e instanceof Error ? e.message : 'Something went wrong'
}
