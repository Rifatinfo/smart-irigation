import React from 'react'
import { DEVICE_ICONS, type DeviceKey } from '@/components/ui/icons'
import { StatusPill } from '@/components/ui/StatusPill'

type Props = {
  device: DeviceKey
  name: string
  on: boolean
  onText: string
  offText: string
  rule: string
  footer: string
  danger?: boolean
}

export function DeviceCell({ device, name, on, onText, offText, rule, footer, danger }: Props) {
  const Icon = DEVICE_ICONS[device]
  return (
    <div className="flex flex-col border-line px-5 py-5 md:px-6 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-t-0">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
            on ? (danger ? 'bg-danger text-white' : 'bg-forest text-leaf') : 'bg-sunken text-faint'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{name}</div>
          <div className="text-xs text-faint">Auto mode</div>
        </div>
        <StatusPill tone={on ? (danger ? 'danger' : 'active') : 'neutral'}>{on ? onText : offText}</StatusPill>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted">{rule}</p>
      <p className="mt-auto pt-3 text-[13px] font-medium tabular text-ink">{footer}</p>
    </div>
  )
}
