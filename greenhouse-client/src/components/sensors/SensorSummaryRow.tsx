import React from 'react'
import { MetricIcon } from '@/components/ui/MetricIcon'
import { CURRENT, METRICS, formatValue, statsFor, type MetricKey, type Range } from '@/lib/data'
import { outsideShare } from '@/lib/sensor-history'

export function SensorSummaryRow({ metric: m, range }: { metric: MetricKey; range: Range }) {
  const s = statsFor(m, range)
  const out = outsideShare(m, range)
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken" style={{ color: METRICS[m].color }}>
            <MetricIcon metric={m} />
          </span>
          <div>
            <div className="font-medium text-ink">{METRICS[m].label}</div>
            <div className="text-xs text-faint">
              {METRICS[m].sensor} · {METRICS[m].pin}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right font-semibold tabular text-ink">
        {formatValue(m, CURRENT[m])} <span className="font-normal text-faint">{METRICS[m].unit}</span>
      </td>
      <td className="px-4 py-4 text-right tabular text-muted">{formatValue(m, s.min)}</td>
      <td className="px-4 py-4 text-right tabular text-muted">{formatValue(m, s.avg)}</td>
      <td className="px-4 py-4 text-right tabular text-muted">{formatValue(m, s.max)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, out.pct)}%`, background: out.pct > 15 ? 'var(--color-warn)' : 'var(--color-ok)' }}
            />
          </div>
          <span className="whitespace-nowrap text-[13px] tabular text-muted">
            {out.pct.toFixed(0)}% · {out.rule}
          </span>
        </div>
      </td>
    </tr>
  )
}
