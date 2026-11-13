'use client'

import React from 'react'
import { Cpu, WifiOff } from 'lucide-react'
import { useGreenhouse, useNow } from '@/components/providers/GreenhouseProvider'
import { apiUrl } from '@/lib/api'
import { ago } from '@/lib/data'

/** Shown until the ESP32 has sent its first reading, or while it is offline. */
export function ConnectionBanner() {
  const { summary } = useGreenhouse()
  const now = useNow(5000)
  const { device } = summary

  if (!summary.hasData) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const local = host === 'localhost' || host === '127.0.0.1'
    return (
      <div className="mb-6 flex flex-wrap items-start gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest text-leaf">
          <Cpu className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold text-ink">Waiting for the first reading from {device.name}</div>
          <p className="mt-1 leading-relaxed text-muted">
            In the ESP32 sketch set <code className="rounded bg-sunken px-1">SERVER_URL</code> to{' '}
            <code className="rounded bg-sunken px-1">{local ? 'http://<this PC’s LAN IP>:5000' : apiUrl()}</code> and{' '}
            <code className="rounded bg-sunken px-1">DEVICE_API_KEY</code> to the key that starts with{' '}
            <code className="rounded bg-sunken px-1">{device.apiKeyPrefix}…</code>, then power it on. The dashboard updates by itself
            as soon as the controller reports.
          </p>
        </div>
      </div>
    )
  }

  if (!device.isOnline) {
    return (
      <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-warn-soft px-5 py-4 text-ink">
        <WifiOff className="h-5 w-5 shrink-0 text-warn" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold">Controller offline</div>
          <div className="text-muted">
            No data from {device.name} since {ago(device.lastSeenAt, now)}. The values below are the last ones received. Check its power
            and Wi-Fi; it runs the same rules on its own until it reconnects.
          </div>
        </div>
      </div>
    )
  }
  return null
}
