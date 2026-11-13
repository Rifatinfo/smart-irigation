'use client'

import React from 'react'
import { MetricIcon } from '@/components/ui/MetricIcon'
import { Panel } from '@/components/ui/Panel'
import { StatusPill } from '@/components/ui/StatusPill'
import { METRICS, formatNextWatering, pillTone } from '@/lib/data'
import { useLiveReadings } from './LiveReadingsProvider'
import { SoilGauge } from './SoilGauge'

export function SoilMoistureCard() {
  const { summary, settings, pumpOn } = useLiveReadings()
  const soil = summary.sensors.soilMoisture

  return (
    <Panel className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 px-5 pt-5 md:px-6 md:pt-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px]"
          style={{ color: METRICS.soil.color, borderColor: METRICS.soil.color }}
        >
          <MetricIcon metric="soil" className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-ink">Soil moisture</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted">{soil.sensor}</p>
        </div>
        <StatusPill tone={pillTone(soil.status)}>{soil.status.label}</StatusPill>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-2 pt-4 md:pt-3">
        <SoilGauge value={soil.value} dry={settings.soilDryThreshold} wet={settings.soilWetTarget} />
      </div>
      <div className="grid grid-cols-2 border-t border-line text-sm short:hidden">
        <div className="px-5 py-4 md:px-6 md:py-3">
          <div className="text-muted">Pump starts below</div>
          <div className="mt-0.5 font-semibold tabular text-ink">{settings.soilDryThreshold}%</div>
        </div>
        <div className="border-l border-line px-5 py-4 md:px-6 md:py-3">
          <div className="text-muted">{pumpOn ? 'Watering until' : 'Next watering'}</div>
          <div className="mt-0.5 font-semibold tabular text-ink">
            {pumpOn ? `${settings.soilWetTarget}%` : formatNextWatering(soil.nextWatering)}
          </div>
        </div>
      </div>
    </Panel>
  )
}
