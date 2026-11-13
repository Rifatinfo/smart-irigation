/**
 * Drop-in client for the greenhouse backend. Copy into your frontend (React / Next.js / Vue / plain TS).
 *
 *   import { gh } from './greenhouse-client';
 *   await gh.login('admin@greenhouse.local', '...');
 *   const summary = await gh.summary();
 *   const stop = gh.live({ reading: (r) => ..., alert: (a) => ... });
 *
 * Uses cookies (credentials: 'include'). Set API_URL to your backend origin.
 */

export const API_URL: string =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_API_URL || process.env?.VITE_API_URL)) ||
  'http://localhost:5000';

// ── types ────────────────────────────────────────────────────────────────
export type Tone = 'ok' | 'warn' | 'alert' | 'unknown';
export interface Status { code: string; label: string; tone: Tone }
export interface SeriesPoint { t: string; v: number | null; min: number | null; max: number | null }

interface SensorBase {
  label: string; sensor: string; unit: string;
  value: number | null; status: Status;
  high24h: number | null; low24h: number | null; lastHourDelta: number | null;
  series: SeriesPoint[];
}
export interface Summary {
  device: Device;
  updatedAt: string | null;
  hasData: boolean;
  sensors: {
    soilMoisture: SensorBase & {
      pumpStartsBelow: number; pumpStopsAt: number;
      nextWatering: { etaSec: number | null; estimatedAt: string | null; state: 'trend' | 'due' | 'watering' | 'steady' | 'unknown' };
    };
    temperature: SensorBase & { buzzerSoundsAbove: number };
    humidity: SensorBase & { healthyRange: { min: number; max: number } };
    light: SensorBase & { growLightBelow: number };
  };
  actuators: Actuators;
  alerts: { activeCount: number; items: Alert[] };
  recentLogs: LogRow[];
  serverTime: string;
}
export interface Device {
  id: string; name: string; isOnline: boolean; lastSeenAt: string | null; firmwareVersion: string | null;
  ipAddress: string | null; rssi: number | null; apiKeyPrefix: string; createdAt: string;
  hardware: { soil: string; temperature: string; humidity: string; light: string };
}
export interface Actuator {
  actuator: 'PUMP' | 'GROW_LIGHT' | 'BUZZER'; mode: 'AUTO' | 'ON' | 'OFF';
  isOn: boolean; desiredOn: boolean; reportedOn: boolean | null; reason: string | null;
  manualUntil: string | null; lastChangedAt: string | null; lastOnAt: string | null; lastOffAt: string | null;
}
export interface Actuators { pump: Actuator | null; growLight: Actuator | null; buzzer: Actuator | null }
export interface Alert {
  id: string; type: 'HIGH_TEMPERATURE' | 'DEVICE_OFFLINE' | 'SENSOR_FAULT' | 'PUMP_INEFFECTIVE';
  severity: 'WARNING' | 'CRITICAL'; status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  title: string; message: string; value: number | null; threshold: number | null;
  openedAt: string; acknowledgedAt: string | null; resolvedAt: string | null;
}
export interface LogRow {
  id: number; level: 'INFO' | 'WARNING' | 'CRITICAL'; source: string; message: string; meta: unknown; createdAt: string;
}
export interface Stat { now: number | null; min: number | null; average: number | null; max: number | null; samples: number; outsidePct: number; outsideLabel: string }
export interface History {
  range: { key: string; from: string; to: string; bucketSec: number };
  thresholds: { soilDry: number; soilWetTarget: number; tempAlarm: number; humidityMin: number; humidityMax: number; lightOn: number };
  stats: { soilMoisture: Stat; temperature: Stat; humidity: Stat; light: Stat };
  series: { soilMoisture: SeriesPoint[]; temperature: SeriesPoint[]; humidity: SeriesPoint[]; light: SeriesPoint[] };
  events: Array<{ id: number; actuator: Actuator['actuator']; source: string; reason: string | null; startedAt: string; endedAt: string | null; durationSec: number | null; soilBefore: number | null; soilAfter: number | null; endReason: string | null }>;
  totals: { samples: number; pumpRuns: number; pumpSeconds: number; growLightSeconds: number; buzzerAlarms: number };
}
export interface Settings {
  soilDryThreshold: number; soilWetTarget: number; pumpMaxRunSec: number; pumpMinIntervalMin: number;
  soilRawDry: number; soilRawWet: number;
  tempAlarmThreshold: number; tempAlarmHysteresis: number; tempLowThreshold: number;
  humidityMin: number; humidityMax: number;
  lightOnThreshold: number; lightHysteresisPct: number; growLightMinSwitchSec: number;
  growLightScheduleEnabled: boolean; growLightStart: string; growLightEnd: string; timezone: string;
  readingIntervalSec: number; offlineAfterSec: number; dataRetentionDays: number; updatedAt: string;
}
export type Range = '24h' | '7d' | '30d';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

// ── core request (auto-refreshes the access token once on 401) ────────────
async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const r = await fetch(`${API_URL}/api/v1/auth/refresh-token`, { method: 'POST', credentials: 'include' });
    if (r.ok) return request<T>(path, init, true);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new ApiError(res.status, body.message || res.statusText, body.error);
  return body.data as T;
}

const q = (deviceId?: string, extra = '') => {
  const p = new URLSearchParams(extra);
  if (deviceId) p.set('deviceId', deviceId);
  const s = p.toString();
  return s ? `?${s}` : '';
};

// ── API ────────────────────────────────────────────────────────────────
export const gh = {
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string; name: string | null }; needPasswordChange: boolean; accessToken: string }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ id: string; email: string | null; name: string | null }>('/auth/me'),

  summary: (deviceId?: string) => request<Summary>(`/dashboard/summary${q(deviceId)}`),
  history: (range: Range = '24h', deviceId?: string) => request<History>(`/history${q(deviceId, `range=${range}`)}`),
  csvUrl: (range: Range = '24h', deviceId?: string) => `${API_URL}/api/v1/history/export.csv${q(deviceId, `range=${range}`)}`,

  settings: (deviceId?: string) => request<Settings>(`/settings${q(deviceId)}`),
  saveSettings: (patch: Partial<Omit<Settings, 'updatedAt'>>, deviceId?: string) =>
    request<Settings>(`/settings${q(deviceId)}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  control: (device: 'pump' | 'grow-light' | 'buzzer', mode: 'AUTO' | 'ON' | 'OFF', durationSec?: number, deviceId?: string) =>
    request<Actuators>(`/control/${device}${q(deviceId)}`, { method: 'POST', body: JSON.stringify({ mode, durationSec }) }),

  alerts: (status: 'active' | 'resolved' | 'all' = 'active', deviceId?: string) =>
    request<Alert[]>(`/alerts${q(deviceId, `status=${status}`)}`),
  acknowledge: (alertId: string) => request<Alert>(`/alerts/${alertId}/acknowledge`, { method: 'POST' }),
  logs: (params: { page?: number; limit?: number; level?: string; source?: string; q?: string } = {}, deviceId?: string) =>
    request<LogRow[]>(`/logs${q(deviceId, new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString())}`),

  /** Live updates. Returns a function that closes the stream. */
  live(handlers: {
    snapshot?: (s: Omit<Summary, never>) => void;
    reading?: (r: { at: string; values: { soilMoisture: number | null; temperature: number | null; humidity: number | null; light: number | null }; statuses: Record<string, Status>; actuators: Actuators; device: Device }) => void;
    actuators?: (a: Actuators) => void;
    alert?: (e: { action: 'opened' | 'acknowledged' | 'resolved'; alert: Alert }) => void;
    log?: (l: LogRow) => void;
    device?: (d: Device) => void;
    settings?: (s: Settings) => void;
  }, deviceId?: string) {
    const es = new EventSource(`${API_URL}/api/v1/stream${q(deviceId)}`, { withCredentials: true });
    for (const [event, fn] of Object.entries(handlers)) {
      if (fn) es.addEventListener(event, (e) => (fn as (x: unknown) => void)(JSON.parse((e as MessageEvent).data)));
    }
    return () => es.close();
  },
};

// ── formatting helpers matching the dashboard design ──────────────────────
/** "~13h from now" / "due now" / "watering now" / "—" */
export function formatNextWatering(n: Summary['sensors']['soilMoisture']['nextWatering']): string {
  if (n.state === 'watering') return 'watering now';
  if (n.state === 'due') return 'due now';
  if (n.etaSec === null) return '—';
  const h = n.etaSec / 3600;
  return h >= 1 ? `~${Math.round(h)}h from now` : `~${Math.max(1, Math.round(n.etaSec / 60))}min from now`;
}

/** "↗ 0 %", "↘ 2.6 °C", "↘ 5,848 lux" */
export function formatDelta(delta: number | null, unit: string): string {
  if (delta === null) return '—';
  const arrow = delta > 0 ? '↗' : delta < 0 ? '↘' : '↗';
  const abs = Math.abs(delta);
  const num = unit === 'lux' ? Math.round(abs).toLocaleString('en-US') : String(Math.round(abs * 10) / 10);
  return `${arrow} ${num} ${unit}`;
}
