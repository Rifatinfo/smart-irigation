'use client'

import React, { createContext, useContext, useState } from 'react'
import { CURRENT, CURRENT_GROW, THRESHOLDS } from '@/lib/data'

export type Mode = 'auto' | 'manual'
export type Device = 'pump' | 'growLight' | 'buzzer'

const INITIAL_RULES = {
  soilOn: THRESHOLDS.soilOn,
  soilOff: THRESHOLDS.soilOff,
  maxRun: 120,
  lightOn: THRESHOLDS.lightOn,
  photoStart: THRESHOLDS.photoStart,
  photoEnd: THRESHOLDS.photoEnd,
  tempAlarm: THRESHOLDS.tempAlarm,
  snooze: 10,
}

export type Rules = typeof INITIAL_RULES

type Automation = {
  rules: Rules
  setRule: <K extends keyof Rules>(k: K, v: Rules[K]) => void
  modes: Record<Device, Mode>
  setMode: (d: Device, m: Mode) => void
  manualOn: Record<Device, boolean>
  setManual: (d: Device, v: boolean) => void
  isOn: (d: Device) => boolean
  dirty: boolean
  saved: boolean
  save: () => void
}

const AutomationContext = createContext<Automation | null>(null)

/** Holds the unsaved rule edits shared by the header's Save button and each device section. */
export function AutomationProvider({ children }: { children: React.ReactNode }) {
  const [modes, setModes] = useState<Record<Device, Mode>>({ pump: 'auto', growLight: 'auto', buzzer: 'auto' })
  const [manualOn, setManualOn] = useState<Record<Device, boolean>>({ pump: false, growLight: !!CURRENT_GROW, buzzer: false })
  const [rules, setRules] = useState(INITIAL_RULES)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const markDirty = () => {
    setDirty(true)
    setSaved(false)
  }

  const setRule = <K extends keyof Rules>(k: K, v: Rules[K]) => {
    setRules((r) => ({ ...r, [k]: v }))
    markDirty()
  }
  const setMode = (d: Device, m: Mode) => {
    setModes((s) => ({ ...s, [d]: m }))
    markDirty()
  }
  const setManual = (d: Device, v: boolean) => setManualOn((s) => ({ ...s, [d]: v }))

  const autoState: Record<Device, boolean> = {
    pump: CURRENT.soil < rules.soilOn,
    growLight: CURRENT.light < rules.lightOn && CURRENT.time.getHours() >= rules.photoStart && CURRENT.time.getHours() < rules.photoEnd,
    buzzer: CURRENT.temperature > rules.tempAlarm,
  }
  const isOn = (d: Device) => (modes[d] === 'auto' ? autoState[d] : manualOn[d])

  const save = () => {
    setDirty(false)
    setSaved(true)
  }

  return (
    <AutomationContext.Provider value={{ rules, setRule, modes, setMode, manualOn, setManual, isOn, dirty, saved, save }}>
      {children}
    </AutomationContext.Provider>
  )
}

export function useAutomation() {
  const ctx = useContext(AutomationContext)
  if (!ctx) throw new Error('useAutomation must be used inside <AutomationProvider>')
  return ctx
}
