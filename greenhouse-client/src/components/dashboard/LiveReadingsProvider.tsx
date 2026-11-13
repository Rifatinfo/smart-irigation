'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import type { Actuators, Settings, Summary } from '@/lib/api'

type Readings = { soil: number | null; temperature: number | null; humidity: number | null; light: number | null }

type LiveReadings = {
  summary: Summary
  settings: Settings
  readings: Readings
  actuators: Actuators
  pumpOn: boolean
  buzzerOn: boolean
  growOn: boolean
}

const LiveReadingsContext = createContext<LiveReadings | null>(null)

/** The dashboard's view of the live controller data (kept current by GreenhouseProvider's realtime stream). */
export function LiveReadingsProvider({ children }: { children: React.ReactNode }) {
  const { summary, settings } = useGreenhouse()

  const value = useMemo<LiveReadings>(() => {
    const s = summary.sensors
    const a = summary.actuators
    return {
      summary,
      settings,
      readings: { soil: s.soilMoisture.value, temperature: s.temperature.value, humidity: s.humidity.value, light: s.light.value },
      actuators: a,
      pumpOn: a.pump?.isOn ?? false,
      growOn: a.growLight?.isOn ?? false,
      buzzerOn: a.buzzer?.isOn ?? false,
    }
  }, [summary, settings])

  return <LiveReadingsContext.Provider value={value}>{children}</LiveReadingsContext.Provider>
}

export function useLiveReadings() {
  const ctx = useContext(LiveReadingsContext)
  if (!ctx) throw new Error('useLiveReadings must be used inside <LiveReadingsProvider>')
  return ctx
}
