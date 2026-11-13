'use client'

import React from 'react'
import { Segmented } from '@/components/ui/Segmented'
import type { Range } from '@/lib/data'
import { RANGE_OPTIONS } from '@/lib/sensor-history'
import { useSensorRange } from './SensorRangeProvider'

export function RangeSelect() {
  const { range, setRange } = useSensorRange()
  return <Segmented<Range> value={range} onChange={setRange} options={RANGE_OPTIONS} />
}
