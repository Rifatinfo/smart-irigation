'use client'

import React, { createContext, useContext, useState } from 'react'
import type { Range } from '@/lib/data'

type SensorRange = { range: Range; setRange: (r: Range) => void }

const SensorRangeContext = createContext<SensorRange | null>(null)

/** Shares the selected time range between the page header and the tables/charts below it. */
export function SensorRangeProvider({ initialRange = '24h', children }: { initialRange?: Range; children: React.ReactNode }) {
  const [range, setRange] = useState<Range>(initialRange)
  return <SensorRangeContext.Provider value={{ range, setRange }}>{children}</SensorRangeContext.Provider>
}

export function useSensorRange() {
  const ctx = useContext(SensorRangeContext)
  if (!ctx) throw new Error('useSensorRange must be used inside <SensorRangeProvider>')
  return ctx
}
