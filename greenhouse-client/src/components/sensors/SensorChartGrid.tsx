'use client'

import React from 'react'
import { METRIC_ORDER } from '@/lib/data'
import { SensorHistoryChart } from './SensorHistoryChart'
import { useSensorRange } from './SensorRangeProvider'

/** One history graph per sensor, two per row on wide screens. */
export function SensorChartGrid() {
  const { range } = useSensorRange()
  return (
    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
      {METRIC_ORDER.map((m) => (
        <SensorHistoryChart key={m} metric={m} range={range} />
      ))}
    </div>
  )
}
