'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CURRENT, CURRENT_GROW } from '@/lib/data'

/** Demo scenarios: `/dashboard?state=watering` or `/dashboard?state=heat-alarm`. */
export type DashboardState = 'default' | 'watering' | 'heat-alarm'

type Readings = { soil: number; temperature: number; humidity: number; light: number }

type LiveReadings = {
  readings: Readings
  pumpOn: boolean
  buzzerOn: boolean
  growOn: boolean
  syncedAgo: number
}

const LiveReadingsContext = createContext<LiveReadings | null>(null)

export function LiveReadingsProvider({ state = 'default', children }: { state?: DashboardState; children: React.ReactNode }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo<LiveReadings>(() => {
    // Live readings: the last sample, nudged slightly each tick, then overridden by the chosen state
    const j = (amp: number) => Math.sin(tick * 1.7) * amp
    const readings = {
      soil: CURRENT.soil + j(0.3),
      temperature: CURRENT.temperature + j(0.08),
      humidity: CURRENT.humidity + j(0.4),
      light: Math.max(10, CURRENT.light + j(4)),
    }
    if (state === 'watering') readings.soil = 33.6
    if (state === 'heat-alarm') {
      readings.temperature = 33.4
      readings.humidity = 52
      readings.light = 21400
    }
    return {
      readings,
      pumpOn: state === 'watering',
      buzzerOn: state === 'heat-alarm',
      growOn: state === 'heat-alarm' ? false : !!CURRENT_GROW,
      syncedAgo: 2 + (tick % 15) * 4,
    }
  }, [tick, state])

  return <LiveReadingsContext.Provider value={value}>{children}</LiveReadingsContext.Provider>
}

export function useLiveReadings() {
  const ctx = useContext(LiveReadingsContext)
  if (!ctx) throw new Error('useLiveReadings must be used inside <LiveReadingsProvider>')
  return ctx
}
