'use client'

import React, { useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { SettingRow } from './SettingRow'
import { useSettings } from './SettingsProvider'

type Units = 'metric' | 'imperial'

const UNITS: { value: Units; label: string }[] = [
  { value: 'metric', label: '°C, litres' },
  { value: 'imperial', label: '°F, gallons' },
]

export function DisplayPanel() {
  const { markChanged } = useSettings()
  const [units, setUnits] = useState<Units>('metric')

  return (
    <Panel>
      <div className="divide-y divide-line">
        <SettingRow label="Units" hint="Temperature in Celsius or Fahrenheit">
          <Segmented<Units>
            value={units}
            onChange={(v) => {
              setUnits(v)
              markChanged()
            }}
            options={UNITS}
          />
        </SettingRow>
        <SettingRow label="Account" hint="Amara Reyes · Site administrator">
          <button className="h-9 whitespace-nowrap rounded-lg border border-line px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunken">
            Change password
          </button>
        </SettingRow>
      </div>
    </Panel>
  )
}
