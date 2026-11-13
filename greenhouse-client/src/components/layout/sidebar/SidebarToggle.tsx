'use client'

import React from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useSidebar } from './SidebarProvider'

/** Expand/collapse button; sits at the left of every page header. */
export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar()
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
    >
      {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
    </button>
  )
}
