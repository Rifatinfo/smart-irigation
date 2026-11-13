'use client'

import React from 'react'
import { SidebarAccount } from './SidebarAccount'
import { SidebarBrand } from './SidebarBrand'
import { SidebarNav } from './SidebarNav'
import { useSidebar } from './SidebarProvider'

export function Sidebar() {
  const { collapsed, toggle } = useSidebar()

  return (
    // Placeholder reserves the rail; on desktop it also reserves the expanded width
    <div className={`relative h-full shrink-0 transition-[width] duration-200 ease-out w-16 ${collapsed ? 'md:w-[76px]' : 'md:w-[248px]'}`}>
      {!collapsed && <button aria-label="Close menu" onClick={toggle} className="fixed inset-0 z-20 bg-forest-deep/40 md:hidden" />}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex h-full flex-col border-r border-edge bg-canvas text-ink transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          collapsed ? 'w-16 md:w-[76px]' : 'w-[248px] overflow-hidden'
        }`}
      >
        <SidebarBrand collapsed={collapsed} />
        <div className="mx-4 mb-3 h-px bg-edge" />
        <SidebarNav collapsed={collapsed} />
        <SidebarAccount collapsed={collapsed} />
      </aside>
    </div>
  )
}
