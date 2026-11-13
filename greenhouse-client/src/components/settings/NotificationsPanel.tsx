'use client'

import React, { useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Switch } from '@/components/ui/Switch'
import { SettingRow } from './SettingRow'
import { useSettings } from './SettingsProvider'

const NOTIFICATIONS = [
  ['heat', 'Heat alarm', 'When the buzzer sounds for high temperature'],
  ['dry', 'Dry soil', 'When soil moisture falls below the pump threshold'],
  ['offline', 'Controller offline', 'When no data arrives for 3 minutes'],
  ['daily', 'Daily summary', 'Water, light and alarms, every morning at 07:00'],
] as const

export function NotificationsPanel() {
  const { markChanged } = useSettings()
  const [notify, setNotify] = useState({ heat: true, dry: true, offline: true, daily: false })

  return (
    <Panel>
      <div className="px-5 pt-5 md:px-6">
        <h2 className="text-[15px] font-semibold text-ink">Notifications</h2>
        <p className="mt-0.5 text-[13px] text-muted">Sent to amara@verdant.farm and the mobile app</p>
      </div>
      <div className="mt-3 divide-y divide-line border-t border-line">
        {NOTIFICATIONS.map(([key, label, hint]) => (
          <SettingRow key={key} label={label} hint={hint}>
            <Switch
              checked={notify[key]}
              onChange={(v) => {
                setNotify((n) => ({ ...n, [key]: v }))
                markChanged()
              }}
              label={label}
            />
          </SettingRow>
        ))}
      </div>
    </Panel>
  )
}
