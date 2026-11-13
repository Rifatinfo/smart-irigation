'use client'

import React from 'react'
import { MetricIcon } from '@/components/ui/MetricIcon'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import type { History } from '@/lib/api'
import { METRICS, SENSOR_KEY, formatValue, type MetricKey } from '@/lib/data'

export function SensorSummaryRow({ metric: m, history }: { metric: MetricKey; history: History | null }) {
  const { summary } = useGreenhouse()
  const s = history?.stats[SENSOR_KEY[m]]
  const pct = s?.outsidePct ?? 0
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken" style={{ color: METRICS[m].color }}>
            <MetricIcon metric={m} />
          </span>
          <div>
            <div className="font-medium text-ink">{METRICS[m].label}</div>
            <div className="text-xs text-faint">{summary.sensors[SENSOR_KEY[m]].sensor}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right font-semibold tabular text-ink">
        {formatValue(m, s?.now)} <span className="font-normal text-faint">{METRICS[m].unit}</span>
      </td>
      <td className="px-4 py-4 text-right tabular text-muted">{formatValue(m, s?.min)}</td>
      <td className="px-4 py-4 text-right tabular text-muted">{formatValue(m, s?.average)}</td>
      <td className="px-4 py-4 text-right tabular text-muted">{formatValue(m, s?.max)}</td>
      <td className="px-6 py-4">
        {s && s.samples > 0 ? (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, pct)}%`, background: pct > 15 ? 'var(--color-warn)' : 'var(--color-ok)' }}
              />
            </div>
            <span className="whitespace-nowrap text-[13px] tabular text-muted">
              {pct.toFixed(0)}% · {s.outsideLabel}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-faint">No readings</span>
        )}
      </td>
    </tr>
  )
}
