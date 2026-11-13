'use client'

import React from 'react'
import { format } from 'date-fns'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { SensorLineChart } from '@/components/charts/SensorLineChart'
import { MetricIcon } from '@/components/ui/MetricIcon'
import { Panel } from '@/components/ui/Panel'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Settings } from '@/lib/api'
import { METRICS, SENSOR_KEY, formatValue, pillTone, toPoints, type MetricKey } from '@/lib/data'
import { useLiveReadings } from './LiveReadingsProvider'

export type ClimateMetric = Exclude<MetricKey, 'soil'>

const DETAILS: Record<
  ClimateMetric,
  { caption: string; limitLabel: string; limit: (s: Settings) => string; variant: 'peak' | 'grid' | 'points' }
> = {
  temperature: {
    caption: 'Air temperature',
    limitLabel: 'Buzzer sounds above',
    limit: (s) => `${s.tempAlarmThreshold} °C`,
    variant: 'peak',
  },
  humidity: {
    caption: 'Relative humidity',
    limitLabel: 'Healthy range',
    limit: (s) => `${s.humidityMin}–${s.humidityMax}%`,
    variant: 'grid',
  },
  light: {
    caption: 'Illuminance at canopy',
    limitLabel: 'Grow light below',
    limit: (s) => `${s.lightOnThreshold.toLocaleString('en-US')} lux`,
    variant: 'points',
  },
}

export function ClimateCard({ metric }: { metric: ClimateMetric }) {
  const { summary, settings } = useLiveReadings()
  const sensor = summary.sensors[SENSOR_KEY[metric]]
  const m = METRICS[metric]
  const trend = sensor.lastHourDelta
  const up = (trend ?? 0) >= 0
  const detail = DETAILS[metric]
  const series = toPoints(sensor.series)

  return (
    <Panel className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 px-5 pt-5 md:px-6 md:pt-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px]"
          style={{ color: m.color, borderColor: m.color }}
        >
          <MetricIcon metric={metric} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-ink">{m.label}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted">{sensor.sensor}</p>
        </div>
        <StatusPill tone={pillTone(sensor.status)}>{sensor.status.label}</StatusPill>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-5 md:px-6 md:pt-3">
        <div>
          <div className="text-[40px] font-semibold leading-none tracking-tight tabular text-ink">
            {formatValue(metric, sensor.value)}
            <span className="ml-1 text-xl font-medium text-muted">{m.unit}</span>
          </div>
          <div className="mt-1.5 text-xs text-muted">{detail.caption}</div>
        </div>
        <dl className="flex gap-5 text-xs">
          <div>
            <dt className="text-faint">24h high</dt>
            <dd className="mt-0.5 font-semibold tabular text-ink">
              {formatValue(metric, sensor.high24h)} {m.unit}
            </dd>
          </div>
          <div>
            <dt className="text-faint">24h low</dt>
            <dd className="mt-0.5 font-semibold tabular text-ink">
              {formatValue(metric, sensor.low24h)} {m.unit}
            </dd>
          </div>
        </dl>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-4 pt-4 md:px-5 md:pb-2 md:pt-2">
        <SensorLineChart
          data={series}
          color={m.color}
          unit={m.unit}
          variant={detail.variant}
          format={(v) => formatValue(metric, v)}
          formatX={(d) => format(d, 'HH:mm')}
          formatTip={(d) => `${format(d, 'EEE HH:mm')} · 15-min avg`}
          yMin={metric === 'light' ? 0 : undefined}
          fill
        />
      </div>

      <div className="grid grid-cols-2 border-t border-line text-sm short:hidden">
        <div className="px-5 py-4 md:px-6 md:py-3">
          <div className="text-muted">{detail.limitLabel}</div>
          <div className="mt-0.5 font-semibold tabular text-ink">{detail.limit(settings)}</div>
        </div>
        <div className="border-l border-line px-5 py-4 md:px-6 md:py-3">
          <div className="text-muted">Last hour</div>
          <div className="mt-0.5 flex items-center gap-1 font-semibold tabular text-ink">
            {trend === null ? (
              '—'
            ) : (
              <>
                {up ? <ArrowUpRight className="h-4 w-4 text-muted" /> : <ArrowDownRight className="h-4 w-4 text-muted" />}
                {formatValue(metric, Math.abs(trend))} {m.unit}
              </>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
