'use client'

import React from 'react'
import { format } from 'date-fns'
import { CURRENT, CURRENT_GROW, TODAY, formatValue } from '@/lib/data'
import { pad } from '@/lib/format'
import { useAutomation } from './AutomationProvider'
import { DeviceSection } from './DeviceSection'
import { RuleSlider } from './RuleSlider'

export function GrowLightRules() {
  const { rules, setRule } = useAutomation()
  return (
    <DeviceSection
      device="growLight"
      name="Grow light"
      sensor={`Light level now ${formatValue('light', CURRENT.light)} lux`}
      onLabel="On"
      offLabel="Off"
      summary={
        <>
          Turn on when light falls below <b className="text-ink">{rules.lightOn.toLocaleString('en-US')} lux</b>, only between{' '}
          <b className="text-ink">{pad(rules.photoStart)}:00</b> and <b className="text-ink">{pad(rules.photoEnd)}:00</b>.
        </>
      }
      stats={[
        { label: 'On today', value: `${TODAY.growHours} h` },
        { label: 'Photoperiod', value: `${rules.photoEnd - rules.photoStart} h` },
        { label: 'Since', value: CURRENT_GROW ? format(CURRENT_GROW.start, 'HH:mm') : '—' },
      ]}
    >
      <RuleSlider
        label="Turn on below"
        unit="lux"
        min={500}
        max={5000}
        step={100}
        value={rules.lightOn}
        onChange={(v) => setRule('lightOn', v)}
        format={(v) => v.toLocaleString('en-US')}
      />
      <RuleSlider label="Photoperiod starts" unit="" min={4} max={10} value={rules.photoStart} onChange={(v) => setRule('photoStart', v)} format={(v) => `${pad(v)}:00`} />
      <RuleSlider label="Photoperiod ends" unit="" min={18} max={24} value={rules.photoEnd} onChange={(v) => setRule('photoEnd', v)} format={(v) => `${pad(v)}:00`} />
    </DeviceSection>
  )
}
