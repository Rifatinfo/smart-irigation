'use client'

import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DEVICE_ICONS } from '@/components/ui/icons'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { errorMessage } from '@/lib/api'
import { formatValue } from '@/lib/data'
import { useLiveReadings } from './LiveReadingsProvider'

/** Red banner while the over-temperature alarm is open. "Silence buzzer" acknowledges the alert. */
export function HeatAlarmBanner() {
  const { buzzerOn, readings, settings, summary, actuators } = useLiveReadings()
  const { acknowledge, control } = useGreenhouse()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const heat = summary.alerts.items.find((a) => a.type === 'HIGH_TEMPERATURE')
  if (!heat && !buzzerOn) return null

  const clearsAt = settings.tempAlarmThreshold - settings.tempAlarmHysteresis
  const silenced = heat?.status === 'ACKNOWLEDGED' && !buzzerOn
  const manualTest = actuators.buzzer?.mode === 'ON' && !heat

  const silence = async () => {
    setBusy(true)
    setError('')
    try {
      if (heat?.status === 'ACTIVE') await acknowledge(heat.id)
      if (actuators.buzzer?.mode === 'ON') await control('buzzer', 'AUTO')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alert"
      className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-5 py-4 ${silenced ? 'bg-danger-soft text-danger' : 'bg-danger text-white'}`}
    >
      <DEVICE_ICONS.buzzer className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          {manualTest ? 'Buzzer test' : `Heat alarm — temperature is ${formatValue('temperature', readings.temperature)} °C`}
        </div>
        <div className={`text-sm ${silenced ? 'text-danger/80' : 'text-white/80'}`}>
          {manualTest
            ? 'The buzzer was switched on manually.'
            : silenced
              ? `Buzzer silenced. The alarm clears by itself once the air cools to ${clearsAt} °C.`
              : `Buzzer is sounding. Open vents or shade the greenhouse; it clears at ${clearsAt} °C.`}
          {error && <span className="ml-1 font-semibold">{error}</span>}
        </div>
      </div>
      {!silenced && (
        <button
          onClick={silence}
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-sm font-semibold text-danger transition-transform duration-150 active:scale-[0.97] disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Silence buzzer
        </button>
      )}
    </div>
  )
}
