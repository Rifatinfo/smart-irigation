'use client'

import React from 'react'
import { BUZZER_ALARMS, CURRENT, TODAY, formatValue } from '@/lib/data'
import { useAutomation } from './AutomationProvider'
import { DeviceSection } from './DeviceSection'
import { RuleSlider } from './RuleSlider'

export function BuzzerRules() {
  const { rules, setRule } = useAutomation()
  const lastAlarm = BUZZER_ALARMS[BUZZER_ALARMS.length - 1]
  return (
    <DeviceSection
      device="buzzer"
      name="Heat buzzer"
      sensor={`Temperature now ${formatValue('temperature', CURRENT.temperature)} °C`}
      onLabel="Sounding"
      offLabel="Silent"
      danger
      summary={
        <>
          Sound the buzzer when air temperature rises above <b className="text-ink">{rules.tempAlarm} °C</b>. Silencing it mutes it for{' '}
          <b className="text-ink">{rules.snooze} min</b>.
        </>
      }
      stats={[
        { label: 'Alarms today', value: String(TODAY.alarms) },
        { label: 'Alarms, 30 days', value: String(BUZZER_ALARMS.length) },
        { label: 'Last peak', value: lastAlarm ? `${lastAlarm.peak.toFixed(1)} °C` : '—' },
      ]}
    >
      <RuleSlider label="Alarm above" unit="°C" min={26} max={40} value={rules.tempAlarm} onChange={(v) => setRule('tempAlarm', v)} />
      <RuleSlider label="Silence for" unit="min" min={5} max={60} step={5} value={rules.snooze} onChange={(v) => setRule('snooze', v)} />
    </DeviceSection>
  )
}
