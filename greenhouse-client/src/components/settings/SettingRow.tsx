import React from 'react'

export function SettingRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 md:px-6">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="mt-0.5 text-[13px] text-muted">{hint}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
