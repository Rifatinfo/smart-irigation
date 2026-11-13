import React from 'react'
import { format, isToday } from 'date-fns'
import { AlertTriangle, CloudUpload, Cpu, LogIn, SlidersHorizontal } from 'lucide-react'
import { DEVICE_ICONS } from '@/components/ui/icons'
import type { Activity } from '@/lib/data'

const STYLE = {
  pump: { icon: DEVICE_ICONS.pump, cls: 'bg-humid/12 text-humid' },
  growLight: { icon: DEVICE_ICONS.growLight, cls: 'bg-light/15 text-light' },
  buzzer: { icon: DEVICE_ICONS.buzzer, cls: 'bg-danger-soft text-danger' },
  alert: { icon: AlertTriangle, cls: 'bg-warn-soft text-warn' },
  device: { icon: Cpu, cls: 'bg-mint text-forest' },
  settings: { icon: SlidersHorizontal, cls: 'bg-sunken text-muted' },
  auth: { icon: LogIn, cls: 'bg-sunken text-muted' },
  system: { icon: CloudUpload, cls: 'bg-sunken text-muted' },
}

export function ActivityItem({ activity, last, compact }: { activity: Activity; last?: boolean; compact?: boolean }) {
  const s = STYLE[activity.kind]
  const Icon = s.icon
  const critical = activity.level === 'CRITICAL'
  return (
    <li className="relative flex gap-3.5 pb-4">
      {!last && <span className="absolute bottom-0 left-[15px] top-9 w-px bg-line" />}
      <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${critical ? 'bg-danger-soft text-danger' : s.cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={`truncate text-sm font-medium ${critical ? 'text-danger' : 'text-ink'}`}>{activity.title}</span>
          <span className="shrink-0 text-xs tabular text-faint">
            {compact
              ? format(activity.time, isToday(activity.time) ? 'HH:mm' : 'EEE HH:mm')
              : format(activity.time, isToday(activity.time) ? 'HH:mm:ss' : 'd MMM, HH:mm')}
          </span>
        </div>
        {activity.detail && (
          <p className={`mt-0.5 text-[13px] leading-snug text-muted ${compact ? 'line-clamp-1' : ''}`} title={activity.detail}>
            {activity.detail}
          </p>
        )}
      </div>
    </li>
  )
}
