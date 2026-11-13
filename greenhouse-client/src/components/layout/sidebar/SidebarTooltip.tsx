import React from 'react'

/** Label shown to the right of a sidebar item on hover while the sidebar is collapsed. */
export function SidebarTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 md:block">
      {children}
    </span>
  )
}
