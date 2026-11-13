'use client'

import React from 'react'
import { CloudOff, CloudUpload, Loader2 } from 'lucide-react'
import { useGreenhouse, useNow } from '@/components/providers/GreenhouseProvider'
import { ago } from '@/lib/data'

/** Header status: when the controller last reported, and whether the dashboard is receiving live updates. */
export function SyncStatus() {
  const { summary, connection } = useGreenhouse()
  const now = useNow(1000)
  const online = summary.device.isOnline

  let icon = <CloudUpload className="h-4 w-4 text-ok" />
  let text: string
  if (!summary.hasData) {
    icon = <Loader2 className="h-4 w-4 animate-spin text-faint" />
    text = 'Waiting for the controller'
  } else if (!online) {
    icon = <CloudOff className="h-4 w-4 text-danger" />
    text = `Controller offline · last reading ${ago(summary.updatedAt, now)}`
  } else {
    text = `Synced ${ago(summary.updatedAt, now)}`
  }

  return (
    <span className="hidden items-center gap-2 whitespace-nowrap text-[13px] text-muted lg:flex">
      {icon} {text}
      <span
        title={connection === 'live' ? 'Live updates on' : connection === 'polling' ? 'Live updates unavailable — refreshing every 10 s' : 'Connecting…'}
        className={`ml-1 h-2 w-2 rounded-full ${connection === 'live' ? 'bg-ok' : connection === 'polling' ? 'bg-warn' : 'bg-faint'}`}
      />
    </span>
  )
}
