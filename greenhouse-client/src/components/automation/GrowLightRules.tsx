'use client'

import React from 'react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { dailyTotals, formatValue, shortTime } from '@/lib/data'
import { pad } from '@/lib/format'
import { useAutomation } from './AutomationProvider'
import { DeviceSection } from './DeviceSection'
import { RuleSlider } from './RuleSlider'
import { RuleToggle } from './RuleToggle'

const hhmm = (h: number) => `${pad(h % 24)}:00`

export function GrowLightRules() {
  const { summary, settings } = useGreenhouse()
  const { rules, setRule, history, isOn } = useAutomation()
  const today = dailyTotals(history, settings.pumpFlowLpm, 1)[0]
  const grow = summary.actuators.growLight
  const photoperiod = (rules.photoEnd - rules.photoStart + 24) % 24 || 24

  return (
    <DeviceSection
      device="growLight"
      name="Grow light"
      sensor={`Light level now ${formatValue('light', summary.sensors.light.value)} lux`}
      onLabel="On"
      offLabel="Off"
      manualHint="Sensor rules are paused. The grow light stays as you set it until you return to automatic."
      summary={
        <>
          Turn on when light falls below <b className="text-ink">{rules.lightOn.toLocaleString('en-US')} lux</b>
          {rules.scheduleOn ? (
            <>
              , only between <b className="text-ink">{hhmm(rules.photoStart)}</b> and <b className="text-ink">{hhmm(rules.photoEnd)}</b>
            </>
          ) : (
            ', at any time of day'
          )}
          . It stays in each state for at least <b className="text-ink">{rules.minSwitchMin} min</b> so its own glow can’t make it flicker.
        </>
      }
      stats={[
        { label: 'On today', value: `${today.growHours} h` },
        { label: 'Photoperiod', value: rules.scheduleOn ? `${photoperiod} h` : 'Any time' },
        { label: 'Since', value: isOn('growLight') && grow?.lastOnAt ? shortTime(grow.lastOnAt) : '—' },
      ]}
    >
      <RuleSlider
        label="Turn on below"
        unit="lux"
        min={100}
        max={10000}
        step={100}
        value={rules.lightOn}
        onChange={(v) => setRule('lightOn', v)}
        format={(v) => v.toLocaleString('en-US')}
      />
      <RuleSlider label="Minimum on/off time" unit="min" min={0} max={30} value={rules.minSwitchMin} onChange={(v) => setRule('minSwitchMin', v)} />
      <RuleToggle
        label="Limit to photoperiod"
        hint="Keep the lamp off at night"
        checked={rules.scheduleOn}
        onChange={(v) => setRule('scheduleOn', v)}
      />
      {rules.scheduleOn && (
        <>
          <RuleSlider label="Photoperiod starts" unit="" min={0} max={12} value={rules.photoStart} onChange={(v) => setRule('photoStart', v)} format={hhmm} />
          <RuleSlider label="Photoperiod ends" unit="" min={13} max={24} value={rules.photoEnd} onChange={(v) => setRule('photoEnd', v)} format={hhmm} />
        </>
      )}
    </DeviceSection>
  )
}
