'use client'

import React from 'react'
import { DailyBarChart } from '@/components/charts/DailyBarChart'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { useHistory } from '@/components/providers/GreenhouseProvider'
import { dailyTotals, fmtLitres } from '@/lib/data'
import { useLiveReadings } from './LiveReadingsProvider'
import { WeekStat } from './WeekStat'

export function WeekPanel() {
  const { settings } = useLiveReadings()
  const { history, stale } = useHistory('7d', 120_000)
  const days = dailyTotals(history ?? stale, settings.pumpFlowLpm, 7)
  const today = days[days.length - 1]
  const weekLitres = days.reduce((a, d) => a + d.litres, 0)
  const weekGrow = days.reduce((a, d) => a + d.growHours, 0)

  return (
    <Panel className="mt-5">
      <PanelHeader
        title="This week"
        meta={`Resources used by the automatic devices · water estimated at ${settings.pumpFlowLpm} L/min of pump run time`}
      />
      <div className="mt-5 grid grid-cols-2 gap-y-5 border-y border-line md:grid-cols-4">
        <WeekStat label="Water used today" value={`≈ ${fmtLitres(today.litres)}`} />
        <WeekStat label="Pump runs today" value={String(today.pumpRuns)} />
        <WeekStat label="Grow light today" value={`${today.growHours} h`} />
        <WeekStat label="Heat alarms today" value={String(today.alarms)} tone={today.alarms ? 'text-danger' : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-8 px-5 py-6 md:grid-cols-2 md:px-6">
        <DailyBarChart
          title="Water per day"
          total={`≈ ${weekLitres.toFixed(1)} L this week`}
          color="var(--color-humid)"
          data={days.map((d) => ({ label: d.label, value: d.litres, text: `${d.litres} L` }))}
        />
        <DailyBarChart
          title="Grow light hours per day"
          total={`${weekGrow.toFixed(1)} h this week`}
          color="var(--color-light)"
          data={days.map((d) => ({ label: d.label, value: d.growHours, text: `${d.growHours} h` }))}
        />
      </div>
    </Panel>
  )
}
