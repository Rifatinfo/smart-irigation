'use client'

import React from 'react'
import { LineChart } from '@/components/charts/LineChart'
import { MetricIcon } from '@/components/ui/MetricIcon'
import { Panel } from '@/components/ui/Panel'
import type { History } from '@/lib/api'
import { METRICS, SENSOR_KEY, formatValue, pumpRuns, toPoints, type MetricKey, type Range } from '@/lib/data'
import { chartNote, chartThreshold, formatAxis, formatTooltip } from '@/lib/sensor-history'

export function SensorHistoryChart({ metric: m, range, history }: { metric: MetricKey; range: Range; history: History | null }) {
  const key = SENSOR_KEY[m]
  const t = history?.thresholds
  return (
    <Panel className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 md:px-6">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <span style={{ color: METRICS[m].color }}>
              <MetricIcon metric={m} />
            </span>
            {METRICS[m].label}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">{chartNote(m, range, t)}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular text-ink">
            {formatValue(m, history?.stats[key].average)} <span className="text-sm font-normal text-muted">{METRICS[m].unit}</span>
          </div>
          <div className="text-xs text-faint">average</div>
        </div>
      </div>
      <div className="px-3 pb-4 pt-4 md:px-5">
        <LineChart
          data={toPoints(history?.series[key])}
          color={METRICS[m].color}
          unit={METRICS[m].unit}
          format={(v) => formatValue(m, v)}
          formatX={formatAxis(range)}
          formatTip={formatTooltip(range)}
          height={230}
          yMin={m === 'light' ? 0 : undefined}
          threshold={chartThreshold(m, t)}
          band={m === 'humidity' && t ? [t.humidityMin, t.humidityMax] : undefined}
          markers={m === 'soil' && range !== '30d' ? pumpRuns(history).map((r) => new Date(r.startedAt)) : []}
          emptyText={history ? 'No readings in this period yet' : 'Loading…'}
        />
      </div>
    </Panel>
  )
}
