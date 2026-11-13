'use client'

import React, { useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { ControllerStatus } from './ControllerStatus'
import { SettingRow } from './SettingRow'
import { useSettings } from './SettingsProvider'

type Interval = '10s' | '30s' | '60s' | '5m'

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '10s', label: '10 s' },
  { value: '30s', label: '30 s' },
  { value: '60s', label: '1 min' },
  { value: '5m', label: '5 min' },
]

export function ControllerPanel() {
  const { markChanged } = useSettings()
  const [name, setName] = useState('Greenhouse A')
  const [interval, setInterval] = useState<Interval>('30s')

  return (
    <Panel>
      <ControllerStatus />
      <div className="divide-y divide-line border-t border-line">
        <SettingRow label="Greenhouse name" hint="Shown in the header and on alerts">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              markChanged()
            }}
            className="h-10 w-full rounded-xl border border-line bg-sunken px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-forest focus:ring-4 focus:ring-forest/10 sm:w-64"
          />
        </SettingRow>
        <SettingRow label="Cloud platform" hint="Where readings are stored for history graphs">
          <div className="text-sm text-ink">
            ThingSpeak · channel <span className="font-medium tabular">2381904</span>
          </div>
        </SettingRow>
        <SettingRow label="Upload interval" hint="How often the controller sends readings">
          <Segmented<Interval>
            value={interval}
            onChange={(v) => {
              setInterval(v)
              markChanged()
            }}
            options={INTERVALS}
          />
        </SettingRow>
      </div>
    </Panel>
  )
}
