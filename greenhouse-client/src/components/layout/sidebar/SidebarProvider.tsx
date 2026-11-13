'use client'

import React, { createContext, useContext, useState } from 'react'

type SidebarState = { collapsed: boolean; toggle: () => void }

const SidebarContext = createContext<SidebarState | null>(null)

/** Open/closed state shared by the sidebar and the toggle button in the page header. */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true)
  return <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside <SidebarProvider>')
  return ctx
}
