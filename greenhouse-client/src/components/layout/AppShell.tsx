import React from 'react'
import { Sidebar } from './sidebar/Sidebar'
import { SidebarProvider } from './sidebar/SidebarProvider'

/**
 * Frame shared by every signed-in page: the sidebar on the left and a column
 * for the page itself (its <PageHeader> and <PageContent>) on the right.
 * Rendered once by app/(dashboard)/layout.tsx, so it stays mounted while navigating.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  )
}
