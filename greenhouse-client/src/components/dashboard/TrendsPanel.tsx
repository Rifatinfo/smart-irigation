'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { LineChart } from '@/components/charts/LineChart'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { Segmented } from '@/components/ui/Segmented'
import { useHistory } from '@/components/providers/GreenhouseProvider'
import type { History } from '@/lib/api'
import { METRICS, SENSOR_KEY, formatValue, pumpRuns, toPoints, type MetricKey } from '@/lib/data'

const OPTIONS: { value: MetricKey; label: string }[] = [
  { value: 'soil', label: 'Soil' },
  { value: 'temperature', label: 'Temp' },
  { value: 'humidity', label: 'Humidity' },
  { value: 'light', label: 'Light' },
]

export function thresholdFor(metric: MetricKey, t: History['thresholds'] | undefined) {
  if (!t) return undefined
  if (metric === 'soil') return { value: t.soilDry, label: `Pump on · ${t.soilDry}%` }
  if (metric === 'temperature') return { value: t.tempAlarm, label: `Buzzer · ${t.tempAlarm} °C` }
  if (metric === 'light') return { value: t.lightOn, label: `Grow light · ${t.lightOn.toLocaleString('en-US')} lux` }
  return undefined
}

export function TrendsPanel({ initialMetric = 'soil' }: { initialMetric?: MetricKey }) {
  const [metric, setMetric] = useState<MetricKey>(initialMetric)
  const { history, stale } = useHistory('24h')
  const h = history ?? stale

  return (
    <Panel className="min-w-0 lg:col-span-8">
      <PanelHeader title="Last 24 hours" meta={metric === 'soil' ? 'Blue markers show pump runs' : `${METRICS[metric].label}, 15-minute averages`}>
        <Segmented<MetricKey> value={metric} onChange={setMetric} options={OPTIONS} />
      </PanelHeader>
      <div className="px-3 pb-4 pt-5 md:px-5">
        <LineChart
          data={toPoints(h?.series[SENSOR_KEY[metric]])}
          color={METRICS[metric].color}
          unit={METRICS[metric].unit}
          format={(v) => formatValue(metric, v)}
          formatX={(d) => format(d, 'HH:mm')}
          formatTip={(d) => format(d, 'EEE HH:mm')}
          height={280}
          threshold={thresholdFor(metric, h?.thresholds)}
          band={metric === 'humidity' && h ? [h.thresholds.humidityMin, h.thresholds.humidityMax] : undefined}
          markers={metric === 'soil' ? pumpRuns(h).map((r) => new Date(r.startedAt)) : []}
          yMin={metric === 'light' ? 0 : undefined}
          emptyText={h ? 'No readings in the last 24 hours yet' : 'Loading…'}
        />
      </div>
    </Panel>
  )
}
