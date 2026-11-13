'use client'

import React from 'react'
import { DEVICE_ICONS } from '@/components/ui/icons'
import { THRESHOLDS } from '@/lib/data'
import { useLiveReadings } from './LiveReadingsProvider'

export function HeatAlarmBanner() {
  const { buzzerOn } = useLiveReadings()
  if (!buzzerOn) return null
  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-danger px-5 py-4 text-white">
      <DEVICE_ICONS.buzzer className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Heat alarm — temperature is 33.4 °C</div>
        <div className="text-sm text-white/80">Buzzer is sounding. Open vents or shade the greenhouse; it clears below {THRESHOLDS.tempAlarm} °C.</div>
      </div>
      <button className="h-9 rounded-lg bg-white px-3.5 text-sm font-semibold text-danger transition-transform duration-150 active:scale-[0.97]">
        Silence buzzer
      </button>
    </div>
  )
}
