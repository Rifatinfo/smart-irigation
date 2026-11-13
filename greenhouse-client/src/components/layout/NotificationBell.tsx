'use client'

import React, { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Bell, Info, OctagonAlert } from 'lucide-react'
import { ALERTS, NOW } from '@/lib/data'

const SEVERITY = {
  critical: { icon: OctagonAlert, cls: 'bg-danger-soft text-danger' },
  warning: { icon: AlertTriangle, cls: 'bg-warn-soft text-warn' },
  info: { icon: Info, cls: 'bg-sunken text-muted' },
}

const RECENT = ALERTS.slice(0, 8)
const isNew = (t: Date) => NOW.getTime() - t.getTime() < 86400000

/** Bell button in the page header; opens a dropdown with the latest alerts. */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(() => new Set())
  const ref = useRef<HTMLDivElement>(null)

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

  const unread = ALERTS.filter((a) => isNew(a.time) && !read.has(a.id)).length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-ink/8 ${open ? 'bg-ink/8' : ''}`}
      >
        <Bell className="h-6 w-6" strokeWidth={1.75} />
        {unread > 0 && (
          // YouTube-style count: solid red pill with a ring in the header colour
          <span className="absolute left-[21px] top-[3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e00] px-[5px] text-[11px] font-bold leading-none text-white ring-2 ring-canvas">
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
              <button onClick={() => setRead(new Set(ALERTS.map((a) => a.id)))} className="text-[13px] font-medium text-forest hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-[min(70vh,420px)] divide-y divide-line overflow-y-auto">
            {RECENT.map((a) => {
              const s = SEVERITY[a.severity]
              const Icon = s.icon
              const fresh = isNew(a.time) && !read.has(a.id)
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
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.resolution}</p>
                    <p className="mt-1 text-xs text-faint">{format(a.time, 'EEE d MMM, HH:mm')}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
