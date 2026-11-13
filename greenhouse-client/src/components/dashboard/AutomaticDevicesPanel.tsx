'use client'

import React from 'react'
import { format } from 'date-fns'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { TextLink } from '@/components/ui/TextLink'
import { BUZZER_ALARMS, CURRENT_GROW, LAST_PUMP, NOW, THRESHOLDS, hoursMinutes } from '@/lib/data'
import { DeviceCell } from './DeviceCell'
import { useLiveReadings } from './LiveReadingsProvider'

export function AutomaticDevicesPanel() {
  const { pumpOn, growOn, buzzerOn } = useLiveReadings()
  const lastAlarm = BUZZER_ALARMS[BUZZER_ALARMS.length - 1]

  return (
    <Panel className="mt-5">
      <PanelHeader title="Automatic devices" meta="Switched by the controller from sensor thresholds">
        <TextLink href="/automation">Edit rules</TextLink>
      </PanelHeader>
      <div className="mt-4 grid grid-cols-1 border-t border-line md:grid-cols-3">
        <DeviceCell
          device="pump"
          name="Water pump"
          on={pumpOn}
          onText="Watering"
          offText="Idle"
          rule={`On below ${THRESHOLDS.soilOn}% soil moisture, off at ${THRESHOLDS.soilOff}%`}
          footer={pumpOn ? 'Started 20:00 · 1.4 L so far' : `Last ran ${format(LAST_PUMP.time, 'EEE HH:mm')} · ${LAST_PUMP.liters} L`}
        />
        <DeviceCell
          device="growLight"
          name="Grow light"
          on={growOn}
          onText="On"
          offText="Off"
          rule={`On below ${THRESHOLDS.lightOn.toLocaleString('en-US')} lux, ${THRESHOLDS.photoStart}:00–${THRESHOLDS.photoEnd}:00`}
          footer={growOn && CURRENT_GROW ? `On for ${hoursMinutes(CURRENT_GROW.start, NOW)} · off at 22:00` : 'Daylight is sufficient'}
        />
        <DeviceCell
          device="buzzer"
          name="Heat buzzer"
          on={buzzerOn}
          onText="Sounding"
          offText="Silent"
          danger
          rule={`Sounds above ${THRESHOLDS.tempAlarm} °C air temperature`}
          footer={
            buzzerOn
              ? 'Triggered 20:00 at 33.4 °C'
              : lastAlarm
                ? `Last alarm ${format(lastAlarm.start, 'EEE HH:mm')} · peak ${lastAlarm.peak.toFixed(1)} °C`
                : 'No alarms in 30 days'
          }
        />
      </div>
    </Panel>
  )
}
