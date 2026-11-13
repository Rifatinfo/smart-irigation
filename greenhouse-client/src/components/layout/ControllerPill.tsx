'use client'

import React from 'react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'

/** "● Online" / "● Offline" / "● Waiting" pill for the ESP32 controller, shown in every page header. */
export function ControllerPill() {
  const { summary } = useGreenhouse()
  const d = summary.device
  const state = d.isOnline ? 'Online' : d.lastSeenAt ? 'Offline' : 'Waiting'
  const cls =
    state === 'Online' ? 'bg-ok-soft text-ok' : state === 'Offline' ? 'bg-danger-soft text-danger' : 'bg-sunken text-muted'
  return (
    <span
      title={`ESP32 controller ${state.toLowerCase()}`}
      className={`hidden h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold sm:flex ${cls}`}
    >
      <span className={`h-2 w-2 rounded-full bg-current ${state === 'Online' ? 'animate-pulse' : ''}`} />
      {state}
    </span>
  )
}
