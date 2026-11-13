import React from 'react'

/**
 * The scrollable body below the page header. It is a size container, so content
 * can size itself to the visible area with cqh units (see the dashboard cards).
 */
export function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto [container-type:size]">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-6 md:px-8 md:py-8">{children}</div>
    </main>
  )
}
