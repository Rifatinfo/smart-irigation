'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { DEVICE_ICONS } from '@/components/ui/icons'
import { Panel } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { StatusPill } from '@/components/ui/StatusPill'
import { useAutomation, type Device, type Mode } from './AutomationProvider'
import { DeviceStats, type DeviceStat } from './DeviceStats'
import { ManualControl } from './ManualControl'

const MODES: { value: Mode; label: string }[] = [
  { value: 'auto', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
]

type Props = {
  device: Device
  name: string
  sensor: string
  onLabel: string
  offLabel: string
  danger?: boolean
  /** Plain-language description of the rule, shown in automatic mode. */
  summary: React.ReactNode
  /** What switching on does in manual mode. */
  manualHint: string
  stats: DeviceStat[]
  /** The rule sliders, shown in automatic mode. */
  children: React.ReactNode
}

export function DeviceSection({ device, name, sensor, onLabel, offLabel, danger, summary, manualHint, stats, children }: Props) {
  const { modes, setMode, setManual, isOn, reason, busy, deviceError } = useAutomation()
  const Icon = DEVICE_ICONS[device]
  const on = isOn(device)
  const mode = modes[device]
  const why = reason(device)

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-4 px-5 py-5 md:px-6">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
            on ? (danger ? 'bg-danger text-white' : 'bg-forest text-leaf') : 'bg-sunken text-faint'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold text-ink">{name}</h2>
            <StatusPill tone={on ? (danger ? 'danger' : 'active') : 'neutral'}>{on ? onLabel : offLabel}</StatusPill>
            {busy[device] && <Loader2 className="h-4 w-4 animate-spin text-faint" />}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {sensor}
            {why && <span className="text-faint"> · {why}</span>}
          </p>
          {deviceError[device] && <p className="mt-1 text-[13px] text-danger">{deviceError[device]}</p>}
        </div>
        <Segmented<Mode> value={mode} onChange={(m) => m !== mode && setMode(device, m)} options={MODES} />
      </div>

      <div className="grid grid-cols-1 border-t border-line lg:grid-cols-12">
        <div className="px-5 py-5 md:px-6 lg:col-span-8">
          {mode === 'auto' ? (
            <>
              <p className="text-sm leading-relaxed text-muted">{summary}</p>
              <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
            </>
          ) : (
            <ManualControl name={name} hint={manualHint} on={on} busy={busy[device]} onChange={(v) => setManual(device, v)} />
          )}
        </div>
        <DeviceStats stats={stats} />
      </div>
    </Panel>
  )
}
