'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ServerCrash } from 'lucide-react'
import {
  api,
  ApiError,
  apiUrl,
  errorMessage,
  type Actuators,
  type Alert,
  type ControlMode,
  type Device,
  type History,
  type LogRow,
  type Range,
  type ReadingEvent,
  type Settings,
  type Summary,
  type User,
} from '@/lib/api'
import { notifyAlert } from '@/lib/notifications'

export type Connection = 'connecting' | 'live' | 'polling'
export type DeviceSlug = 'pump' | 'grow-light' | 'buzzer'

type Greenhouse = {
  user: User
  summary: Summary
  settings: Settings
  /** live = realtime stream open; polling = stream unavailable, refreshing every 10 s */
  connection: Connection
  /** Bumped whenever an actuator switches (new pump run, grow-light session…) so history views refetch. */
  eventsVersion: number
  /** Bumped on every alert change so alert lists refetch. */
  alertsVersion: number
  refreshSummary: () => Promise<void>
  setSettings: (s: Settings) => void
  setUser: (u: User) => void
  setDeviceName: (d: Device) => void
  control: (device: DeviceSlug, mode: ControlMode, durationSec?: number) => Promise<void>
  acknowledge: (alertId: string) => Promise<void>
  logout: () => Promise<void>
}

const GreenhouseContext = createContext<Greenhouse | null>(null)

const SUMMARY_REFRESH_MS = 60_000 // charts, 24 h high/low and "last hour" change
const POLL_MS = 10_000 // when the live stream is down
const READING_REFRESH_DELAY_MS = 20_000 // after live readings, refresh the derived numbers at most this often

/** A stream snapshot has no chart series; keep the ones already loaded. */
function keepSeries(prev: Summary | null, next: Summary): Summary {
  if (!prev) return next
  const sensors = { ...next.sensors }
  for (const k of Object.keys(sensors) as Array<keyof Summary['sensors']>) {
    if (!sensors[k].series.length) sensors[k] = { ...sensors[k], series: prev.sensors[k].series } as never
  }
  return { ...next, sensors }
}

function applyAlert(prev: Summary, alert: Alert): Summary {
  let items = prev.alerts.items.filter((a) => a.id !== alert.id)
  if (alert.status !== 'RESOLVED') items = [alert, ...items]
  return { ...prev, alerts: { items, activeCount: items.filter((a) => a.status === 'ACTIVE').length } }
}

/**
 * Loads the signed-in user, the dashboard summary and the settings, then keeps them current with the
 * server's realtime stream (Server-Sent Events). Redirects to /login when the session is missing or expired.
 */
export function GreenhouseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [eventsVersion, setEventsVersion] = useState(0)
  const [alertsVersion, setAlertsVersion] = useState(0)
  const [attempt, setAttempt] = useState(0)

  const goLogin = useCallback(() => {
    const next = window.location.pathname + window.location.search
    router.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [router])

  /** Returns true when the error was a lost session (and we are redirecting). */
  const handleAuthError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        goLogin()
        return true
      }
      return false
    },
    [goLogin],
  )

  const refreshSummary = useCallback(async () => {
    try {
      const s = await api.summary()
      setSummary(s)
    } catch (e) {
      if (!handleAuthError(e)) console.warn('[greenhouse] summary refresh failed:', errorMessage(e))
    }
  }, [handleAuthError])

  // Coalesces the refreshes triggered by live readings
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleRefresh = useCallback(
    (delay = READING_REFRESH_DELAY_MS) => {
      if (refreshTimer.current) return
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        void refreshSummary()
      }, delay)
    },
    [refreshSummary],
  )
  useEffect(() => () => void (refreshTimer.current && clearTimeout(refreshTimer.current)), [])

  // ── initial load ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    ;(async () => {
      try {
        const me = await api.me()
        const [s, st] = await Promise.all([api.summary(), api.settings()])
        if (cancelled) return
        setUser(me)
        setSummary(s)
        setSettings(st)
        setPhase('ready')
      } catch (e) {
        if (cancelled || handleAuthError(e)) return
        setError(errorMessage(e))
        setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attempt, handleAuthError])

  // ── realtime stream ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready') return
    let es: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const on = <T,>(event: string, fn: (data: T) => void) =>
      es?.addEventListener(event, (e) => {
        try {
          fn(JSON.parse((e as MessageEvent).data) as T)
        } catch (err) {
          console.warn(`[greenhouse] bad ${event} event`, err)
        }
      })

    const open = () => {
      setConnection('connecting')
      es = new EventSource(api.streamUrl(), { withCredentials: true })
      es.onopen = () => setConnection('live')
      es.onerror = () => {
        if (es?.readyState !== EventSource.CLOSED) {
          setConnection('connecting') // the browser retries by itself
          return
        }
        // The server refused the stream (usually an expired login): refresh the session, then reconnect.
        es.close()
        setConnection('polling')
        retry = setTimeout(async () => {
          try {
            await api.me()
          } catch (e) {
            if (handleAuthError(e)) return
          }
          if (!stopped) open()
        }, POLL_MS)
      }

      on<Summary>('snapshot', (s) => setSummary((prev) => keepSeries(prev, s)))
      on<ReadingEvent>('reading', (r) => {
        setSummary((prev) => {
          if (!prev) return prev
          const sn = prev.sensors
          return {
            ...prev,
            hasData: true,
            updatedAt: r.at,
            device: r.device,
            actuators: r.actuators,
            sensors: {
              soilMoisture: { ...sn.soilMoisture, value: r.values.soilMoisture, status: r.statuses.soilMoisture },
              temperature: { ...sn.temperature, value: r.values.temperature, status: r.statuses.temperature },
              humidity: { ...sn.humidity, value: r.values.humidity, status: r.statuses.humidity },
              light: { ...sn.light, value: r.values.light, status: r.statuses.light },
            },
          }
        })
        scheduleRefresh()
      })
      on<Actuators>('actuators', (a) => {
        setSummary((prev) => (prev ? { ...prev, actuators: a } : prev))
        setEventsVersion((v) => v + 1)
      })
      on<{ action: 'opened' | 'acknowledged' | 'resolved'; alert: Alert }>('alert', ({ action, alert }) => {
        setSummary((prev) => (prev ? applyAlert(prev, alert) : prev))
        setAlertsVersion((v) => v + 1)
        if (action === 'opened') notifyAlert(alert)
      })
      on<LogRow>('log', (row) => {
        setSummary((prev) =>
          prev ? { ...prev, recentLogs: [row, ...prev.recentLogs.filter((l) => l.id !== row.id)].slice(0, 10) } : prev,
        )
      })
      on<Device>('device', (d) => setSummary((prev) => (prev ? { ...prev, device: d } : prev)))
      on<Settings>('settings', (s) => {
        setSettings(s)
        scheduleRefresh(500)
      })
    }

    open()
    return () => {
      stopped = true
      es?.close()
      clearTimeout(retry)
    }
  }, [phase, handleAuthError, scheduleRefresh])

  // ── periodic refresh (fast while the stream is down) ─────────
  useEffect(() => {
    if (phase !== 'ready') return
    const id = setInterval(refreshSummary, connection === 'live' ? SUMMARY_REFRESH_MS : POLL_MS)
    return () => clearInterval(id)
  }, [phase, connection, refreshSummary])

  // ── actions ──────────────────────────────────────────────────
  const control = useCallback(
    async (device: DeviceSlug, mode: ControlMode, durationSec?: number) => {
      try {
        const actuators = await api.control(device, mode, durationSec)
        setSummary((prev) => (prev ? { ...prev, actuators } : prev))
        setEventsVersion((v) => v + 1)
      } catch (e) {
        if (!handleAuthError(e)) throw e
      }
    },
    [handleAuthError],
  )

  const acknowledge = useCallback(
    async (alertId: string) => {
      try {
        const alert = await api.acknowledge(alertId)
        setSummary((prev) => (prev ? applyAlert(prev, alert) : prev))
        setAlertsVersion((v) => v + 1)
        void refreshSummary() // buzzer state
      } catch (e) {
        if (!handleAuthError(e)) throw e
      }
    },
    [handleAuthError, refreshSummary],
  )

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined)
    router.replace('/login')
  }, [router])

  const setDeviceName = useCallback((d: Device) => setSummary((prev) => (prev ? { ...prev, device: d } : prev)), [])

  const value = useMemo<Greenhouse | null>(
    () =>
      user && summary && settings
        ? {
            user,
            summary,
            settings,
            connection,
            eventsVersion,
            alertsVersion,
            refreshSummary,
            setSettings,
            setUser,
            setDeviceName,
            control,
            acknowledge,
            logout,
          }
        : null,
    [user, summary, settings, connection, eventsVersion, alertsVersion, refreshSummary, setDeviceName, control, acknowledge, logout],
  )

  if (phase === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas px-5">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 text-center">
          <ServerCrash className="mx-auto h-8 w-8 text-danger" />
          <h1 className="mt-3 font-display text-2xl text-ink">Can’t load the greenhouse</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{error}</p>
          <p className="mt-2 text-xs text-faint">Server: {apiUrl()}</p>
          <button
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-5 h-10 rounded-xl bg-forest px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-forest-hover"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!value) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 bg-canvas text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-forest" /> Connecting to the greenhouse…
      </div>
    )
  }

  return <GreenhouseContext.Provider value={value}>{children}</GreenhouseContext.Provider>
}

export function useGreenhouse() {
  const ctx = useContext(GreenhouseContext)
  if (!ctx) throw new Error('useGreenhouse must be used inside <GreenhouseProvider>')
  return ctx
}

/**
 * Sensor history for a range, refetched when the range changes, when a device switches, when settings change
 * and every `refreshMs`. Keeps showing the previous data while a new range loads.
 */
export function useHistory(range: Range, refreshMs = 60_000) {
  const { eventsVersion, settings } = useGreenhouse()
  const [data, setData] = useState<History | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .history(range)
        .then((h) => {
          if (cancelled) return
          setData(h)
          setError('')
        })
        .catch((e) => !cancelled && setError(errorMessage(e)))
    load()
    const id = setInterval(load, refreshMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [range, refreshMs, eventsVersion, settings.updatedAt])

  const current = data && data.range.key === range ? data : null
  return { history: current, stale: data, loading: !current && !error, error }
}

/** Re-renders every `ms` so "12s ago" style labels stay current. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
