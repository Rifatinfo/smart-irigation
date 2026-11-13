'use client'

import React from 'react'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { TextLink } from '@/components/ui/TextLink'
import { useNow } from '@/components/providers/GreenhouseProvider'
import type { Actuator } from '@/lib/api'
import { fmtLitres, hoursMinutes, litres, shortTime } from '@/lib/data'
import { DeviceCell } from './DeviceCell'
import { useLiveReadings } from './LiveReadingsProvider'

/** "Auto mode" / "Manual · on until 14:05" / "Manual · off" */
export function modeText(a: Actuator | null) {
  if (!a) return 'Not configured'
  if (a.mode === 'AUTO') return 'Auto mode'
  const until = a.manualUntil ? ` until ${shortTime(a.manualUntil)}` : ''
  return `Manual · ${a.mode === 'ON' ? 'on' : 'off'}${until}`
}

/** Duration of the last completed ON period, from the actuator's last on/off timestamps. */
function lastRunSec(a: Actuator) {
  if (!a.lastOnAt || !a.lastOffAt) return null
  const s = (new Date(a.lastOffAt).getTime() - new Date(a.lastOnAt).getTime()) / 1000
  return s >= 0 ? Math.round(s) : null
}

export function AutomaticDevicesPanel() {
  const { actuators, settings, summary } = useLiveReadings()
  const now = useNow(30_000)
  const { pump, growLight, buzzer } = actuators
  const pumpOn = pump?.isOn ?? false
  const growOn = growLight?.isOn ?? false
  const buzzerOn = buzzer?.isOn ?? false
  const heat = summary.alerts.items.find((a) => a.type === 'HIGH_TEMPERATURE')

  const pumpFooter = (() => {
    if (!pump) return '—'
    if (pumpOn) return `Started ${shortTime(pump.lastOnAt)} · ${pump.reason ?? 'watering'}`
    const sec = lastRunSec(pump)
    if (!pump.lastOnAt) return pump.reason ?? 'Has not run yet'
    return `Last ran ${shortTime(pump.lastOnAt)}${sec !== null ? ` · ${sec}s, ≈ ${fmtLitres(litres(sec, settings.pumpFlowLpm))}` : ''}`
  })()

  const schedule = settings.growLightScheduleEnabled ? `, ${settings.growLightStart}–${settings.growLightEnd}` : ''
  const growFooter = (() => {
    if (!growLight) return '—'
    if (growOn && growLight.lastOnAt) {
      return `On for ${hoursMinutes(new Date(growLight.lastOnAt), new Date(now))}${settings.growLightScheduleEnabled ? ` · off by ${settings.growLightEnd}` : ''}`
    }
    return growLight.reason ?? 'Daylight is sufficient'
  })()

  const buzzerFooter = (() => {
    if (!buzzer) return '—'
    if (buzzerOn) return heat?.value != null ? `Triggered ${shortTime(heat.openedAt)} at ${heat.value.toFixed(1)} °C` : (buzzer.reason ?? 'Sounding')
    if (heat?.status === 'ACKNOWLEDGED') return `Silenced · still above ${settings.tempAlarmThreshold - settings.tempAlarmHysteresis} °C`
    return buzzer.lastOnAt ? `Last alarm ${shortTime(buzzer.lastOnAt)}` : 'No alarms yet'
  })()

  return (
    <Panel className="mt-5">
      <PanelHeader title="Automatic devices" meta="Switched by the controller from sensor thresholds">
        <TextLink href="/automation">Edit rules</TextLink>
      </PanelHeader>
      <div className="mt-4 grid grid-cols-1 border-t border-line md:grid-cols-3">
        <DeviceCell
          device="pump"
          name="Water pump"
          mode={modeText(pump)}
          on={pumpOn}
          onText="Watering"
          offText="Idle"
          rule={`On below ${settings.soilDryThreshold}% soil moisture, off at ${settings.soilWetTarget}% (max ${settings.pumpMaxRunSec}s per run)`}
          footer={pumpFooter}
        />
        <DeviceCell
          device="growLight"
          name="Grow light"
          mode={modeText(growLight)}
          on={growOn}
          onText="On"
          offText="Off"
          rule={`On below ${settings.lightOnThreshold.toLocaleString('en-US')} lux${schedule}`}
          footer={growFooter}
        />
        <DeviceCell
          device="buzzer"
          name="Heat buzzer"
          mode={modeText(buzzer)}
          on={buzzerOn}
          onText="Sounding"
          offText="Silent"
          danger
          rule={`Sounds above ${settings.tempAlarmThreshold} °C air temperature`}
          footer={buzzerFooter}
        />
      </div>
    </Panel>
  )
}
