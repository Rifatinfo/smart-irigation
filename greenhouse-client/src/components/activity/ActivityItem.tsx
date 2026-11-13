import React from 'react'
import { format } from 'date-fns'
import { CloudUpload } from 'lucide-react'
import { DEVICE_ICONS } from '@/components/ui/icons'
import type { Activity } from '@/lib/data'

const STYLE = {
  pump: { icon: DEVICE_ICONS.pump, cls: 'bg-humid/12 text-humid' },
  growLight: { icon: DEVICE_ICONS.growLight, cls: 'bg-light/15 text-light' },
  buzzer: { icon: DEVICE_ICONS.buzzer, cls: 'bg-danger-soft text-danger' },
  system: { icon: CloudUpload, cls: 'bg-sunken text-muted' },
}

export function ActivityItem({ activity, last, compact }: { activity: Activity; last?: boolean; compact?: boolean }) {
  const s = STYLE[activity.kind]
  const Icon = s.icon
  return (
    <li className="relative flex gap-3.5 pb-4">
      {!last && <span className="absolute bottom-0 left-[15px] top-9 w-px bg-line" />}
      <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-ink">{activity.title}</span>
          <span className="shrink-0 text-xs tabular text-faint">{format(activity.time, compact ? 'HH:mm' : 'HH:mm')}</span>
        </div>
        <p className={`mt-0.5 text-[13px] leading-snug text-muted ${compact ? 'line-clamp-1' : ''}`}>{activity.detail}</p>
      </div>
    </li>
  )
}
