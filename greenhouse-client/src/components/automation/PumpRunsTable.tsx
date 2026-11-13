'use client'

import React from 'react'
import { format } from 'date-fns'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { fmtLitres, litres, pumpRuns } from '@/lib/data'
import { useAutomation } from './AutomationProvider'

const END: Record<string, string> = {
  TARGET_REACHED: 'target reached',
  MAX_RUNTIME: 'safety cut-off',
  SENSOR_FAULT: 'sensor fault',
  MANUAL: 'stopped manually',
}

const SOURCE: Record<string, string> = { AUTO: 'Automatic', MANUAL: 'Manual', SAFETY: 'Safety', SYSTEM: 'System' }

export function PumpRunsTable() {
  const { settings } = useGreenhouse()
  const { history } = useAutomation()
  const runs = pumpRuns(history).slice(-8).reverse()
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`)

  return (
    <Panel>
      <PanelHeader title="Recent pump runs" meta="Every watering in the last 30 days, newest first" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-y border-line text-[13px] text-muted">
              <th className="px-6 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Soil moisture</th>
              <th className="px-4 py-3 text-right font-medium">Water</th>
              <th className="px-6 py-3 text-right font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs.map((r) => {
              const running = r.endedAt === null
              const sec = r.durationSec ?? Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000)
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-6 py-3.5 tabular text-ink">
                    {format(new Date(r.startedAt), 'EEE d MMM, HH:mm')}
                    <span className="ml-2 text-xs text-faint">{SOURCE[r.source] ?? r.source}</span>
                  </td>
                  <td className="px-4 py-3.5 tabular text-muted">
                    {pct(r.soilBefore)} → {running ? 'watering…' : pct(r.soilAfter)}
                    {r.endReason && END[r.endReason] && <span className="ml-2 text-xs text-faint">{END[r.endReason]}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular text-ink">≈ {fmtLitres(litres(sec, settings.pumpFlowLpm))}</td>
                  <td className="px-6 py-3.5 text-right tabular text-muted">{sec} s</td>
                </tr>
              )
            })}
            {!runs.length && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[13px] text-faint">
                  {history ? 'The pump has not run in the last 30 days.' : 'Loading…'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
