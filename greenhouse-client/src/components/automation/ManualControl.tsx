'use client'

import React from 'react'
import { Switch } from '@/components/ui/Switch'

type Props = { name: string; hint: string; on: boolean; busy?: boolean; onChange: (v: boolean) => void }

export function ManualControl({ name, hint, on, busy, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-warn-soft px-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">Manual control</div>
        <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
      </div>
      <div className={`flex items-center gap-3 text-sm font-medium text-ink ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        {on ? 'On' : 'Off'}
        <Switch checked={on} onChange={onChange} label={`Turn ${name} on or off`} />
      </div>
    </div>
  )
}
