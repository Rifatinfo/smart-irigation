'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type SidebarState = { collapsed: boolean; toggle: () => void }

const SidebarContext = createContext<SidebarState | null>(null)
const KEY = 'greenhouse.sidebarCollapsed'

/**
 * Open/closed state shared by the sidebar and the toggle button in the page header.
 * Open by default on tablet/desktop, closed on phones; the user's choice is remembered in this browser.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(KEY)
    } catch {
      /* storage blocked: use the default */
    }
    const wide = window.matchMedia('(min-width: 768px)').matches
    setCollapsed(wide ? saved === '1' : true)
  }, [])

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c
      if (window.matchMedia('(min-width: 768px)').matches) {
        try {
          localStorage.setItem(KEY, next ? '1' : '0')
        } catch {
          /* ignore */
        }
      }
      return next
    })

  return <SidebarContext.Provider value={{ collapsed, toggle }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside <SidebarProvider>')
  return ctx
}
