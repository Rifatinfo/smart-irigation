'use client'

import React from 'react'
import { Menu } from 'lucide-react'
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink shadow-[0_1px_2px_rgba(15,58,28,0.06)] transition-colors duration-150 hover:bg-mint"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
