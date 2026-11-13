'use client'

import React from 'react'
import { LineChart } from '@/components/charts/LineChart'
import { MetricIcon } from '@/components/ui/MetricIcon'
import { Panel } from '@/components/ui/Panel'
import { METRICS, PUMP_RUNS, THRESHOLDS, formatValue, seriesFor, statsFor, type MetricKey, type Range } from '@/lib/data'
import { chartNote, chartThreshold, formatAxis, formatTooltip } from '@/lib/sensor-history'

export function SensorHistoryChart({ metric: m, range }: { metric: MetricKey; range: Range }) {
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
          <p className="mt-0.5 text-[13px] text-muted">{chartNote(m, range)}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular text-ink">
            {formatValue(m, statsFor(m, range).avg)} <span className="text-sm font-normal text-muted">{METRICS[m].unit}</span>
          </div>
          <div className="text-xs text-faint">average</div>
        </div>
      </div>
      <div className="px-3 pb-4 pt-4 md:px-5">
        <LineChart
          data={seriesFor(m, range)}
          color={METRICS[m].color}
          unit={METRICS[m].unit}
          format={(v) => formatValue(m, v)}
          formatX={formatAxis(range)}
          formatTip={formatTooltip(range)}
          height={230}
          yMin={m === 'light' ? 0 : undefined}
          threshold={chartThreshold(m, range)}
          band={m === 'humidity' ? [THRESHOLDS.humidityMin, THRESHOLDS.humidityMax] : undefined}
          markers={m === 'soil' && range !== '30d' ? PUMP_RUNS.map((r) => r.time) : []}
        />
      </div>
    </Panel>
  )
}
