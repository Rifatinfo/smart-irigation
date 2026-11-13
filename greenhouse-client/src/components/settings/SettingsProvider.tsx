'use client'

import React, { createContext, useContext, useState } from 'react'

type SettingsSave = { saved: boolean; save: () => void; markChanged: () => void }

const SettingsContext = createContext<SettingsSave | null>(null)

/** Tracks whether the settings on screen have been saved; any edit resets the "Saved" state. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState(false)
  return (
    <SettingsContext.Provider value={{ saved, save: () => setSaved(true), markChanged: () => setSaved(false) }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
