'use client'

import React from 'react'
import { Panel } from '@/components/ui/Panel'
import { METRIC_ORDER } from '@/lib/data'
import { SensorSummaryRow } from './SensorSummaryRow'
import { useSensorRange } from './SensorRangeProvider'

/** Comparison table — the whole range at a glance. */
export function SensorSummaryTable() {
  const { history, loading } = useSensorRange()
  return (
    <Panel className={`overflow-hidden transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[13px] text-muted">
              <th className="px-6 py-3.5 font-medium">Sensor</th>
              <th className="px-4 py-3.5 text-right font-medium">Now</th>
              <th className="px-4 py-3.5 text-right font-medium">Min</th>
              <th className="px-4 py-3.5 text-right font-medium">Average</th>
              <th className="px-4 py-3.5 text-right font-medium">Max</th>
              <th className="px-6 py-3.5 font-medium">Time outside target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {METRIC_ORDER.map((m) => (
              <SensorSummaryRow key={m} metric={m} history={history} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
