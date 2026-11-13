'use client'

import React from 'react'
import { Panel } from '@/components/ui/Panel'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { NumberField } from './NumberField'
import { SettingRow } from './SettingRow'
import { useSettings } from './SettingsProvider'

function UseCurrent({ raw, onUse }: { raw: number | null; onUse: (v: number) => void }) {
  if (raw === null) return null
  return (
    <button type="button" onClick={() => onUse(raw)} className="whitespace-nowrap text-[13px] font-medium text-forest hover:underline">
      Use current ({raw})
    </button>
  )
}

/** Sensor calibration and monitoring ranges that are not automation rules. */
export function CalibrationPanel() {
  const { summary } = useGreenhouse()
  const { draft, set } = useSettings()
  const raw = summary.sensors.soilMoisture.raw

  return (
    <Panel>
      <div className="px-5 pt-5 md:px-6">
        <h2 className="text-[15px] font-semibold text-ink">Sensors &amp; calibration</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Soil probe raw value now: <span className="font-medium tabular text-ink">{raw ?? '—'}</span>. Hold the probe in dry air, then in a
          glass of water, and save each reading. Applies immediately, no re-flashing needed.
        </p>
      </div>
      <div className="mt-3 divide-y divide-line border-t border-line">
        <SettingRow label="Soil probe — dry" hint="Raw value with the probe in dry air (0 % moisture)">
          <div className="flex items-center gap-3">
            <UseCurrent raw={raw} onUse={(v) => set('soilRawDry', v)} />
            <NumberField label="Dry raw value" value={draft.soilRawDry} min={0} max={4095} onChange={(v) => set('soilRawDry', Math.round(v))} />
          </div>
        </SettingRow>
        <SettingRow label="Soil probe — wet" hint="Raw value with the probe in water (100 % moisture)">
          <div className="flex items-center gap-3">
            <UseCurrent raw={raw} onUse={(v) => set('soilRawWet', v)} />
            <NumberField label="Wet raw value" value={draft.soilRawWet} min={0} max={4095} onChange={(v) => set('soilRawWet', Math.round(v))} />
          </div>
        </SettingRow>
        <SettingRow label="Pump flow rate" hint="Used to estimate the water delivered. Time how long the pump takes to fill a 500 ml bottle.">
          <NumberField label="Pump flow" value={draft.pumpFlowLpm} min={0.01} max={100} step={0.1} unit="L/min" onChange={(v) => set('pumpFlowLpm', v)} />
        </SettingRow>
        <SettingRow label="Healthy humidity" hint="An alert opens when the air is drier or more humid than this">
          <div className="flex items-center gap-2">
            <NumberField label="Minimum humidity" value={draft.humidityMin} min={0} max={100} onChange={(v) => set('humidityMin', v)} />
            <span className="text-faint">–</span>
            <NumberField label="Maximum humidity" value={draft.humidityMax} min={0} max={100} unit="%" onChange={(v) => set('humidityMax', v)} />
          </div>
        </SettingRow>
        <SettingRow label="Low temperature alert" hint="An alert opens when the air is colder than this">
          <NumberField label="Low temperature" value={draft.tempLowThreshold} min={-40} max={60} step={0.5} unit="°C" onChange={(v) => set('tempLowThreshold', v)} />
        </SettingRow>
      </div>
    </Panel>
  )
}
