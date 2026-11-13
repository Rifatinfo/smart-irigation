'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, OctagonAlert } from 'lucide-react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { api, type Alert } from '@/lib/api'
import { loadSeen, saveSeen } from '@/lib/notifications'

/** The green notification bell artwork in public/icons. */
const BELL_ICON = '/icons/Glossy%20Green%20Notification%20Bell%20Icon.png'

const SEVERITY = {
  CRITICAL: { icon: OctagonAlert, cls: 'bg-danger-soft text-danger' },
  WARNING: { icon: AlertTriangle, cls: 'bg-warn-soft text-warn' },
  RESOLVED: { icon: CheckCircle2, cls: 'bg-sunken text-muted' },
}

export function alertState(a: Alert) {
  if (a.status === 'RESOLVED') return `Resolved ${a.resolvedAt ? format(new Date(a.resolvedAt), 'EEE HH:mm') : ''}`
  if (a.status === 'ACKNOWLEDGED') return 'Acknowledged · clears by itself when back to normal'
  return 'Active'
}

/** Bell button in the page header; opens a dropdown with the latest alerts from the controller. */
export function NotificationBell() {
  const { alertsVersion, summary, acknowledge } = useGreenhouse()
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setSeen(loadSeen()), [])

  useEffect(() => {
    let cancelled = false
    api
      .alerts('all', 1, 8)
      .then((r) => !cancelled && setAlerts(r.items))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [alertsVersion])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Unread = open alerts (from the live summary) the user has not looked at yet
  const openAlerts = summary.alerts.items
  const unread = openAlerts.filter((a) => a.status === 'ACTIVE' && !seen.has(a.id)).length

  const markAllRead = () => {
    const next = new Set(seen)
    openAlerts.forEach((a) => next.add(a.id))
    setSeen(next)
    saveSeen(next)
  }

  const ack = async (id: string) => {
    setBusy(id)
    try {
      await acknowledge(id)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[0_2px_8px_-2px_rgba(15,58,28,0.12)] transition-colors duration-150 hover:bg-mint ${open ? 'bg-mint' : ''}`}
      >
        <Image src={BELL_ICON} alt="" width={26} height={26} className="object-contain" style={{ width: 26, height: 26 }} />
        {unread > 0 && (
          // YouTube-style count: solid red pill with a ring in the header colour
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e00] px-[5px] text-[11px] font-bold leading-none text-white ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-edge bg-surface shadow-[0_20px_50px_-12px_rgba(22,33,27,0.25)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-semibold text-ink">Notifications</h2>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[13px] font-medium text-forest hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-[min(70vh,420px)] divide-y divide-line overflow-y-auto">
            {alerts.map((a) => {
              const s = a.status === 'RESOLVED' ? SEVERITY.RESOLVED : SEVERITY[a.severity]
              const Icon = s.icon
              const fresh = a.status === 'ACTIVE' && !seen.has(a.id)
              return (
                <li key={a.id} className={`flex gap-3 px-4 py-3 ${fresh ? 'bg-sunken/70' : ''}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      {fresh && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-temp" aria-label="New" />}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.message}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-faint">
                      <span>
                        {format(new Date(a.openedAt), 'EEE d MMM, HH:mm')} · {alertState(a)}
                      </span>
                      {a.status === 'ACTIVE' && (
                        <button
                          onClick={() => void ack(a.id)}
                          disabled={busy === a.id}
                          className="shrink-0 font-medium text-forest hover:underline disabled:opacity-50"
                        >
                          {a.type === 'HIGH_TEMPERATURE' ? 'Silence' : 'Acknowledge'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
            {!alerts.length && <li className="px-4 py-8 text-center text-[13px] text-faint">No alerts yet. All readings are within their limits.</li>}
          </ul>
          <Link
            href="/activity"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-[13px] font-medium text-forest hover:bg-sunken"
          >
            View all alerts and activity
          </Link>
        </div>
      )}
    </div>
  )
}
