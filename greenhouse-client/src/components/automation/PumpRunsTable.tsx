import React from 'react'
import { format } from 'date-fns'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { PUMP_RUNS } from '@/lib/data'

export function PumpRunsTable() {
  const runs = PUMP_RUNS.slice(-6).reverse()
  return (
    <Panel>
      <PanelHeader title="Recent pump runs" meta="Every automatic watering, newest first" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-y border-line text-[13px] text-muted">
              <th className="px-6 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Soil moisture</th>
              <th className="px-4 py-3 text-right font-medium">Water</th>
              <th className="px-6 py-3 text-right font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs.map((r) => (
              <tr key={r.time.getTime()}>
                <td className="whitespace-nowrap px-6 py-3.5 tabular text-ink">{format(r.time, 'EEE d MMM, HH:mm')}</td>
                <td className="px-4 py-3.5 tabular text-muted">
                  {Math.round(r.before)}% → {r.after}%
                </td>
                <td className="px-4 py-3.5 text-right tabular text-ink">{r.liters} L</td>
                <td className="px-6 py-3.5 text-right tabular text-muted">{r.seconds} s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
