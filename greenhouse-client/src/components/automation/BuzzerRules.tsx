'use client'

import React from 'react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { dailyTotals, formatValue, shortTime } from '@/lib/data'
import { BUZZER_TEST_SEC, useAutomation } from './AutomationProvider'
import { DeviceSection } from './DeviceSection'
import { RuleSlider } from './RuleSlider'

export function BuzzerRules() {
  const { summary, settings } = useGreenhouse()
  const { rules, setRule, history } = useAutomation()
  const alarms = (history?.events ?? []).filter((e) => e.actuator === 'BUZZER' && e.source === 'AUTO')
  const today = dailyTotals(history, settings.pumpFlowLpm, 1)[0]
  const last = alarms.at(-1)

  return (
    <DeviceSection
      device="buzzer"
      name="Heat buzzer"
      sensor={`Temperature now ${formatValue('temperature', summary.sensors.temperature.value)} °C`}
      onLabel="Sounding"
      offLabel="Silent"
      danger
      manualHint={`Automatic alarms are paused and the buzzer stays silent. Switching it on sounds a ${BUZZER_TEST_SEC}-second test, then the buzzer returns to automatic.`}
      summary={
        <>
          Sound the buzzer when air temperature rises above <b className="text-ink">{rules.tempAlarm} °C</b>. It stops once the air cools to{' '}
          <b className="text-ink">{+(rules.tempAlarm - rules.tempHyst).toFixed(1)} °C</b>, or when you silence the alarm.
        </>
      }
      stats={[
        { label: 'Alarms today', value: String(today.alarms) },
        { label: 'Alarms, 30 days', value: String(alarms.length) },
        { label: 'Last alarm', value: last ? shortTime(last.startedAt) : '—' },
      ]}
    >
      <RuleSlider label="Alarm above" unit="°C" min={20} max={45} step={0.5} value={rules.tempAlarm} onChange={(v) => setRule('tempAlarm', v)} />
      <RuleSlider
        label="Clears after cooling by"
        unit="°C"
        min={0.5}
        max={5}
        step={0.5}
        value={rules.tempHyst}
        onChange={(v) => setRule('tempHyst', v)}
      />
    </DeviceSection>
  )
}
