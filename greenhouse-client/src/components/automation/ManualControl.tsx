'use client'

import React from 'react'
import { Switch } from '@/components/ui/Switch'

export function ManualControl({ name, on, onChange }: { name: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-warn-soft px-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">Manual control</div>
        <p className="mt-0.5 text-[13px] text-muted">Sensor rules are paused. The device stays as you set it until you return to automatic.</p>
      </div>
      <div className="flex items-center gap-3 text-sm font-medium text-ink">
        {on ? 'On' : 'Off'}
        <Switch checked={on} onChange={onChange} label={`Turn ${name} on or off`} />
      </div>
    </div>
  )
}
