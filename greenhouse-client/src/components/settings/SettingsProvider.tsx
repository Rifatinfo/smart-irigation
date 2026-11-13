'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { api, errorMessage, type Settings, type SettingsPatch } from '@/lib/api'

/** Settings fields edited on this page (the automation rules are edited on the Automation page). */
const FIELDS = [
  'readingIntervalSec',
  'offlineAfterSec',
  'soilRawDry',
  'soilRawWet',
  'pumpFlowLpm',
  'humidityMin',
  'humidityMax',
  'tempLowThreshold',
  'timezone',
  'dataRetentionDays',
] as const satisfies ReadonlyArray<keyof Settings>

export type Field = (typeof FIELDS)[number]
export type Draft = Pick<Settings, Field> & { name: string }

const draftFrom = (s: Settings, name: string): Draft => ({ ...(Object.fromEntries(FIELDS.map((f) => [f, s[f]])) as Pick<Settings, Field>), name })

type SettingsSave = {
  draft: Draft
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string
  save: () => void
  /** kept for components that only flag an edit */
  markChanged: () => void
}

const SettingsContext = createContext<SettingsSave | null>(null)

/** Holds the unsaved edits on the Settings page; Save sends only what changed. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, setSettings, summary, setDeviceName } = useGreenhouse()
  const [draft, setDraft] = useState(() => draftFrom(settings, summary.device.name))
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!touched) setDraft(draftFrom(settings, summary.device.name))
  }, [settings, summary.device.name, touched])

  const patch = useMemo(() => {
    const p: SettingsPatch = {}
    for (const f of FIELDS) if (draft[f] !== settings[f]) (p as Record<string, unknown>)[f] = draft[f]
    return p
  }, [draft, settings])
  const nameChanged = draft.name.trim() !== summary.device.name
  const dirty = Object.keys(patch).length > 0 || nameChanged

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    setTouched(true)
    setSaved(false)
    setError('')
  }

  const save = async () => {
    if (!dirty) return
    if (!draft.name.trim()) return setError('Greenhouse name cannot be empty')
    setSaving(true)
    setError('')
    try {
      if (Object.keys(patch).length) setSettings(await api.saveSettings(patch))
      if (nameChanged) setDeviceName(await api.renameDevice(summary.device.id, draft.name.trim()))
      setTouched(false)
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsContext.Provider value={{ draft, set, dirty, saving, saved, error, save, markChanged: () => setSaved(false) }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
