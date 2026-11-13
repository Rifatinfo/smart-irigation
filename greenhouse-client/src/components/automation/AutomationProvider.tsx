'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useGreenhouse, useHistory, type DeviceSlug } from '@/components/providers/GreenhouseProvider'
import { api, errorMessage, type History, type Settings, type SettingsPatch } from '@/lib/api'
import { hourOf } from '@/lib/data'
import { pad } from '@/lib/format'

export type Mode = 'auto' | 'manual'
export type Device = 'pump' | 'growLight' | 'buzzer'

export const SLUG: Record<Device, DeviceSlug> = { pump: 'pump', growLight: 'grow-light', buzzer: 'buzzer' }

/** Length of a manual buzzer test. Manual pump runs last the pump's safety cut-off. */
export const BUZZER_TEST_SEC = 5

/** The rule values edited with the sliders (a view of the server settings). */
function rulesFrom(s: Settings) {
  return {
    soilOn: s.soilDryThreshold,
    soilOff: s.soilWetTarget,
    maxRun: s.pumpMaxRunSec,
    soakMin: s.pumpMinIntervalMin,
    lightOn: s.lightOnThreshold,
    scheduleOn: s.growLightScheduleEnabled,
    photoStart: hourOf(s.growLightStart),
    photoEnd: hourOf(s.growLightEnd, true),
    minSwitchMin: Math.round(s.growLightMinSwitchSec / 60),
    tempAlarm: s.tempAlarmThreshold,
    tempHyst: s.tempAlarmHysteresis,
  }
}

export type Rules = ReturnType<typeof rulesFrom>

/** Only the fields that differ from the saved settings. */
function patchFrom(r: Rules, s: Settings): SettingsPatch {
  const next: SettingsPatch = {
    soilDryThreshold: r.soilOn,
    soilWetTarget: r.soilOff,
    pumpMaxRunSec: r.maxRun,
    pumpMinIntervalMin: r.soakMin,
    lightOnThreshold: r.lightOn,
    growLightScheduleEnabled: r.scheduleOn,
    growLightStart: `${pad(r.photoStart % 24)}:00`,
    growLightEnd: `${pad(r.photoEnd % 24)}:00`,
    growLightMinSwitchSec: r.minSwitchMin * 60,
    tempAlarmThreshold: r.tempAlarm,
    tempAlarmHysteresis: r.tempHyst,
  }
  return Object.fromEntries(
    Object.entries(next).filter(([k, v]) => v !== s[k as keyof Settings]),
  ) as SettingsPatch
}

type Automation = {
  rules: Rules
  setRule: <K extends keyof Rules>(k: K, v: Rules[K]) => void
  modes: Record<Device, Mode>
  setMode: (d: Device, m: Mode) => void
  setManual: (d: Device, v: boolean) => void
  isOn: (d: Device) => boolean
  reason: (d: Device) => string | null
  busy: Record<Device, boolean>
  deviceError: Record<Device, string>
  dirty: boolean
  saving: boolean
  saved: boolean
  saveError: string
  save: () => void
  discard: () => void
  /** Last 30 days of device runs, for the stats and the pump-runs table. */
  history: History | null
}

const AutomationContext = createContext<Automation | null>(null)

const none = { pump: false, growLight: false, buzzer: false }
const noErr = { pump: '', growLight: '', buzzer: '' }

/** Holds the unsaved rule edits shared by the header's Save button and each device section. */
export function AutomationProvider({ children }: { children: React.ReactNode }) {
  const { settings, setSettings, summary, control } = useGreenhouse()
  const [rules, setRules] = useState(() => rulesFrom(settings))
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState<Record<Device, boolean>>(none)
  const [deviceError, setDeviceError] = useState<Record<Device, string>>(noErr)
  const { history, stale } = useHistory('30d', 120_000)

  // Settings changed elsewhere (another tab, Settings page) and nothing is being edited here: follow them.
  useEffect(() => {
    if (!touched) setRules(rulesFrom(settings))
  }, [settings, touched])

  const patch = useMemo(() => patchFrom(rules, settings), [rules, settings])
  const dirty = Object.keys(patch).length > 0

  const setRule = <K extends keyof Rules>(k: K, v: Rules[K]) => {
    setRules((r) => ({ ...r, [k]: v }))
    setTouched(true)
    setSaved(false)
    setSaveError('')
  }

  const save = useCallback(async () => {
    if (!dirty) return
    setSaving(true)
    setSaveError('')
    try {
      const next = await api.saveSettings(patch)
      setSettings(next)
      setRules(rulesFrom(next))
      setTouched(false)
      setSaved(true)
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [dirty, patch, setSettings])

  const discard = () => {
    setRules(rulesFrom(settings))
    setTouched(false)
    setSaveError('')
  }

  const actuator = (d: Device) => summary.actuators[d]
  const isOn = (d: Device) => actuator(d)?.isOn ?? false
  const modes: Record<Device, Mode> = {
    pump: actuator('pump')?.mode === 'AUTO' ? 'auto' : 'manual',
    growLight: actuator('growLight')?.mode === 'AUTO' ? 'auto' : 'manual',
    buzzer: actuator('buzzer')?.mode === 'AUTO' ? 'auto' : 'manual',
  }

  const run = async (d: Device, fn: () => Promise<void>) => {
    setBusy((b) => ({ ...b, [d]: true }))
    setDeviceError((e) => ({ ...e, [d]: '' }))
    try {
      await fn()
    } catch (e) {
      setDeviceError((x) => ({ ...x, [d]: errorMessage(e) }))
    } finally {
      setBusy((b) => ({ ...b, [d]: false }))
    }
  }

  // Manual mode starts with the device off (the grow light keeps its current state), until switched on.
  const setMode = (d: Device, m: Mode) =>
    run(d, () => control(SLUG[d], m === 'auto' ? 'AUTO' : d === 'growLight' && isOn(d) ? 'ON' : 'OFF'))

  const setManual = (d: Device, v: boolean) =>
    run(d, () => control(SLUG[d], v ? 'ON' : 'OFF', v && d === 'pump' ? settings.pumpMaxRunSec : v && d === 'buzzer' ? BUZZER_TEST_SEC : undefined))

  return (
    <AutomationContext.Provider
      value={{
        rules,
        setRule,
        modes,
        setMode,
        setManual,
        isOn,
        reason: (d) => actuator(d)?.reason ?? null,
        busy,
        deviceError,
        dirty,
        saving,
        saved,
        saveError,
        save,
        discard,
        history: history ?? stale,
      }}
    >
      {children}
    </AutomationContext.Provider>
  )
}

export function useAutomation() {
  const ctx = useContext(AutomationContext)
  if (!ctx) throw new Error('useAutomation must be used inside <AutomationProvider>')
  return ctx
}
