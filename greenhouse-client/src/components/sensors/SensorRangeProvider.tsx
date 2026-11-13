'use client'

import React, { createContext, useContext, useState } from 'react'
import { useHistory } from '@/components/providers/GreenhouseProvider'
import type { History } from '@/lib/api'
import type { Range } from '@/lib/data'

type SensorRange = {
  range: Range
  setRange: (r: Range) => void
  /** History for the selected range (or the previous range's data while the new one loads). */
  history: History | null
  loading: boolean
  error: string
}

const SensorRangeContext = createContext<SensorRange | null>(null)

/** Shares the selected time range, and its history from the server, between the page header and the tables/charts below it. */
export function SensorRangeProvider({ initialRange = '24h', children }: { initialRange?: Range; children: React.ReactNode }) {
  const [range, setRange] = useState<Range>(initialRange)
  const { history, stale, loading, error } = useHistory(range)
  return (
    <SensorRangeContext.Provider value={{ range, setRange, history: history ?? stale, loading, error }}>{children}</SensorRangeContext.Provider>
  )
}

export function useSensorRange() {
  const ctx = useContext(SensorRangeContext)
  if (!ctx) throw new Error('useSensorRange must be used inside <SensorRangeProvider>')
  return ctx
}
