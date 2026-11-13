'use client'

import React from 'react'
import { Cpu, Wifi, WifiOff } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import { useGreenhouse, useNow } from '@/components/providers/GreenhouseProvider'
import { ago } from '@/lib/data'

export function ControllerStatus() {
  const { summary } = useGreenhouse()
  const now = useNow(5000)
  const d = summary.device
  const never = !d.lastSeenAt
  const details = never
    ? 'Has not connected yet'
    : [d.firmwareVersion && `Firmware ${d.firmwareVersion}`, d.ipAddress && `IP ${d.ipAddress.replace(/^::ffff:/, '')}`, `Last reading ${ago(d.lastSeenAt, now)}`]
        .filter(Boolean)
        .join(' · ')

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-5 md:px-6">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${d.isOnline ? 'bg-forest text-leaf' : 'bg-sunken text-faint'}`}>
        <Cpu className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-semibold text-ink">ESP32 controller</h2>
          <StatusPill tone={d.isOnline ? 'ok' : never ? 'neutral' : 'danger'}>{d.isOnline ? 'Online' : never ? 'Waiting' : 'Offline'}</StatusPill>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">{details}</p>
      </div>
      {d.rssi !== null && (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted" title="Wi-Fi signal strength">
          {d.isOnline ? <Wifi className="h-4 w-4 text-ok" /> : <WifiOff className="h-4 w-4 text-faint" />} {d.rssi} dBm
        </span>
      )}
    </div>
  )
}
