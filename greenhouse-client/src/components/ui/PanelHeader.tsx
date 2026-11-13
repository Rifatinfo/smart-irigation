import React from 'react'

export function PanelHeader({ title, meta, children }: { title: string; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {meta && <p className="mt-0.5 text-[13px] text-muted">{meta}</p>}
      </div>
      {children}
    </div>
  )
}
