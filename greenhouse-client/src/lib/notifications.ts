import type { Alert, AlertType } from './api'

/** Which alert types raise a desktop notification in this browser. Stored per browser in localStorage. */
export type NotifyKey = 'heat' | 'dry' | 'offline' | 'climate' | 'faults'

export const NOTIFY_FOR: Record<AlertType, NotifyKey> = {
  HIGH_TEMPERATURE: 'heat',
  SOIL_DRY: 'dry',
  DEVICE_OFFLINE: 'offline',
  HUMIDITY_OUT_OF_RANGE: 'climate',
  LOW_TEMPERATURE: 'climate',
  SENSOR_FAULT: 'faults',
  PUMP_INEFFECTIVE: 'faults',
}

export const DEFAULT_PREFS: Record<NotifyKey, boolean> = { heat: true, dry: true, offline: true, climate: false, faults: true }

const KEY = 'greenhouse.notify'

export function loadPrefs(): Record<NotifyKey, boolean> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(p: Record<NotifyKey, boolean>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* private mode: preferences just won't persist */
  }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/** Shows a desktop notification for a newly opened alert, if the user enabled that kind. */
export function notifyAlert(alert: Alert) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  if (!loadPrefs()[NOTIFY_FOR[alert.type]]) return
  try {
    new Notification(alert.title, { body: alert.message, tag: alert.id, icon: '/icons/logo.png' })
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}

/* Alerts the user has already seen in the bell dropdown */
const SEEN = 'greenhouse.seenAlerts'
export function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN) ?? '[]'))
  } catch {
    return new Set()
  }
}
export function saveSeen(s: Set<string>) {
  try {
    localStorage.setItem(SEEN, JSON.stringify([...s].slice(-200)))
  } catch {
    /* ignore */
  }
}
