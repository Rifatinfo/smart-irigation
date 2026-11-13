'use client'

import React, { useEffect, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Switch } from '@/components/ui/Switch'
import { DEFAULT_PREFS, loadPrefs, notificationsSupported, savePrefs, type NotifyKey } from '@/lib/notifications'
import { SettingRow } from './SettingRow'

const NOTIFICATIONS: ReadonlyArray<readonly [NotifyKey, string, string]> = [
  ['heat', 'Heat alarm', 'When the buzzer sounds for high temperature'],
  ['dry', 'Dry soil', 'When soil moisture falls below the pump threshold'],
  ['offline', 'Controller offline', 'When the ESP32 stops sending data'],
  ['climate', 'Humidity & cold', 'When humidity leaves its healthy range or the air gets too cold'],
  ['faults', 'Sensor & pump faults', 'When a sensor stops responding or watering does not raise soil moisture'],
]

/** Desktop notifications for new alerts, while the dashboard is open in this browser. Saved per browser. */
export function NotificationsPanel() {
  const [notify, setNotify] = useState(DEFAULT_PREFS)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    setNotify(loadPrefs())
    setPermission(notificationsSupported() ? Notification.permission : 'unsupported')
  }, [])

  const update = async (key: NotifyKey, v: boolean) => {
    const next = { ...notify, [key]: v }
    setNotify(next)
    savePrefs(next)
    if (v && notificationsSupported() && Notification.permission === 'default') {
      setPermission(await Notification.requestPermission())
    }
  }

  const hint =
    permission === 'unsupported'
      ? 'This browser does not support desktop notifications. Alerts still appear under the bell.'
      : permission === 'denied'
        ? 'Notifications are blocked for this site in your browser settings. Alerts still appear under the bell.'
        : permission === 'granted'
          ? 'Desktop notifications in this browser while the dashboard is open. Saved on this device.'
          : 'Turn one on to allow desktop notifications in this browser. Saved on this device.'

  return (
    <Panel>
      <div className="px-5 pt-5 md:px-6">
        <h2 className="text-[15px] font-semibold text-ink">Notifications</h2>
        <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
      </div>
      <div className="mt-3 divide-y divide-line border-t border-line">
        {NOTIFICATIONS.map(([key, label, rowHint]) => (
          <SettingRow key={key} label={label} hint={rowHint}>
            <Switch checked={notify[key]} onChange={(v) => void update(key, v)} label={label} />
          </SettingRow>
        ))}
      </div>
    </Panel>
  )
}
