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
    <div className={`relative h-full shrink-0 transition-[width] duration-200 ease-out w-16 ${collapsed ? 'md:w-[76px]' : 'md:w-[260px]'}`}>
      {!collapsed && <button aria-label="Close menu" onClick={toggle} className="fixed inset-0 z-20 bg-forest-deep/30 md:hidden" />}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex h-full flex-col overflow-hidden border-r border-line bg-surface text-ink shadow-[4px_0_24px_-16px_rgba(15,58,28,0.18)] transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          collapsed ? 'w-16 md:w-[76px]' : 'w-[260px]'
        }`}
      >
        {/* Watercolour greenhouse, fading in from the white panel at the bottom of the sidebar */}
        {!collapsed && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-[72px] h-[300px] bg-[url('/icons/sidebar_bg.jpg')] bg-[length:108%_auto] bg-[position:center_bottom] bg-no-repeat opacity-90 [mask-image:linear-gradient(to_bottom,transparent,black_45%)] short:h-[200px]"
          />
        )}
        <SidebarBrand collapsed={collapsed} />
        <div className="mx-4 mb-4 h-px bg-line" />
        <SidebarNav collapsed={collapsed} />
        <SidebarAccount collapsed={collapsed} />
      </aside>
    </div>
  )
}
