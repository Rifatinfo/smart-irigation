import React from 'react'
import { Cpu, Wifi } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'

export function ControllerStatus() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-5 md:px-6">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest text-leaf">
        <Cpu className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-semibold text-ink">ESP32 controller</h2>
          <StatusPill tone="ok">Online</StatusPill>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">Firmware 2.4.1 · Uptime 6 h 15 m · MAC 24:6F:28:A1:3C:90</p>
      </div>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted">
        <Wifi className="h-4 w-4 text-ok" /> −61 dBm
      </span>
    </div>
  )
}
