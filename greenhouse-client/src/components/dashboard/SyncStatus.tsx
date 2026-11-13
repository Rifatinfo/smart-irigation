'use client'

import React from 'react'
import { CloudUpload } from 'lucide-react'
import { useLiveReadings } from './LiveReadingsProvider'

export function SyncStatus() {
  const { syncedAgo } = useLiveReadings()
  return (
    <span className="hidden items-center gap-2 whitespace-nowrap text-[13px] text-muted lg:flex">
      <CloudUpload className="h-4 w-4 text-ok" /> Synced {syncedAgo}s ago
    </span>
  )
}
