import React from 'react'
import { DailyBarChart } from '@/components/charts/DailyBarChart'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { TODAY, dailyGrowHours, dailyWater } from '@/lib/data'
import { WeekStat } from './WeekStat'

export function WeekPanel() {
  const water = dailyWater(7)
  const grow = dailyGrowHours(7)
  const weekWater = water.reduce((a, d) => a + d.liters, 0)
  return (
    <Panel className="mt-5">
      <PanelHeader title="This week" meta="Resources used by the automatic devices" />
      <div className="mt-5 grid grid-cols-2 gap-y-5 border-y border-line md:grid-cols-4">
        <WeekStat label="Water used today" value={`${TODAY.water} L`} />
        <WeekStat label="Pump runs today" value={String(TODAY.pumpRuns)} />
        <WeekStat label="Grow light today" value={`${TODAY.growHours} h`} />
        <WeekStat label="Heat alarms today" value={String(TODAY.alarms)} tone={TODAY.alarms ? 'text-danger' : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-8 px-5 py-6 md:grid-cols-2 md:px-6">
        <DailyBarChart
          title="Water per day"
          total={`${weekWater.toFixed(1)} L this week`}
          color="var(--color-humid)"
          data={water.map((d) => ({ label: d.label, value: d.liters, text: `${d.liters} L` }))}
        />
        <DailyBarChart
          title="Grow light hours per day"
          total={`${grow.reduce((a, d) => a + d.hours, 0)} h this week`}
          color="var(--color-light)"
          data={grow.map((d) => ({ label: d.label, value: d.hours, text: `${d.hours} h` }))}
        />
      </div>
    </Panel>
  )
}
