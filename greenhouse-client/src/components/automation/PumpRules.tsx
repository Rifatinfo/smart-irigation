'use client'

import React from 'react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { dailyTotals, fmtLitres, formatValue, pumpRuns, shortTime } from '@/lib/data'
import { useAutomation } from './AutomationProvider'
import { DeviceSection } from './DeviceSection'
import { RuleSlider } from './RuleSlider'

export function PumpRules() {
  const { summary, settings } = useGreenhouse()
  const { rules, setRule, history } = useAutomation()
  const today = dailyTotals(history, settings.pumpFlowLpm, 1)[0]
  const last = pumpRuns(history).at(-1)

  return (
    <DeviceSection
      device="pump"
      name="Water pump"
      sensor={`Soil moisture now ${formatValue('soil', summary.sensors.soilMoisture.value)}%`}
      onLabel="Watering"
      offLabel="Idle"
      manualHint={`Sensor rules are paused and the pump stays off. Switching it on waters for ${settings.pumpMaxRunSec} s (the safety cut-off), then the pump returns to automatic.`}
      summary={
        <>
          Turn on when soil moisture drops below <b className="text-ink">{rules.soilOn}%</b>, and off once it reaches{' '}
          <b className="text-ink">{rules.soilOff}%</b> or after <b className="text-ink">{rules.maxRun} s</b>. Between runs, wait{' '}
          <b className="text-ink">{rules.soakMin} min</b> for the water to soak in.
        </>
      }
      stats={[
        { label: 'Water today', value: `≈ ${fmtLitres(today.litres)}` },
        { label: 'Runs today', value: String(today.pumpRuns) },
        { label: 'Last run', value: last ? shortTime(last.startedAt) : '—' },
      ]}
    >
      <RuleSlider label="Turn on below" unit="%" min={10} max={60} value={rules.soilOn} onChange={(v) => setRule('soilOn', Math.min(v, rules.soilOff - 5))} />
      <RuleSlider label="Turn off at" unit="%" min={30} max={95} value={rules.soilOff} onChange={(v) => setRule('soilOff', Math.max(v, rules.soilOn + 5))} />
      <RuleSlider label="Safety cut-off" unit="s" min={5} max={120} step={5} value={rules.maxRun} onChange={(v) => setRule('maxRun', v)} />
      <RuleSlider label="Soak time between runs" unit="min" min={0} max={60} value={rules.soakMin} onChange={(v) => setRule('soakMin', v)} />
    </DeviceSection>
  )
}
