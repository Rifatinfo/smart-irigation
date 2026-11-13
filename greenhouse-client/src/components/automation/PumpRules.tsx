'use client'

import React from 'react'
import { format } from 'date-fns'
import { CURRENT, PUMP_RUNS, TODAY, formatValue } from '@/lib/data'
import { useAutomation } from './AutomationProvider'
import { DeviceSection } from './DeviceSection'
import { RuleSlider } from './RuleSlider'

export function PumpRules() {
  const { rules, setRule } = useAutomation()
  return (
    <DeviceSection
      device="pump"
      name="Water pump"
      sensor={`Soil moisture now ${formatValue('soil', CURRENT.soil)}%`}
      onLabel="Watering"
      offLabel="Idle"
      summary={
        <>
          Turn on when soil moisture drops below <b className="text-ink">{rules.soilOn}%</b>, and off once it reaches{' '}
          <b className="text-ink">{rules.soilOff}%</b> or after <b className="text-ink">{rules.maxRun} s</b>.
        </>
      }
      stats={[
        { label: 'Water today', value: `${TODAY.water} L` },
        { label: 'Runs today', value: String(TODAY.pumpRuns) },
        { label: 'Last run', value: format(PUMP_RUNS[PUMP_RUNS.length - 1].time, 'EEE HH:mm') },
      ]}
    >
      <RuleSlider label="Turn on below" unit="%" min={15} max={50} value={rules.soilOn} onChange={(v) => setRule('soilOn', Math.min(v, rules.soilOff - 5))} />
      <RuleSlider label="Turn off at" unit="%" min={40} max={85} value={rules.soilOff} onChange={(v) => setRule('soilOff', Math.max(v, rules.soilOn + 5))} />
      <RuleSlider label="Safety cut-off" unit="s" min={30} max={300} step={10} value={rules.maxRun} onChange={(v) => setRule('maxRun', v)} />
    </DeviceSection>
  )
}
