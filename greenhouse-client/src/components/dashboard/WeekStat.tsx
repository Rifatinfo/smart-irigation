import React from 'react'

export function WeekStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-5 py-4 md:px-6 [&:nth-child(even)]:border-l [&:nth-child(even)]:border-line md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-line">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular ${tone ?? 'text-ink'}`}>{value}</div>
    </div>
  )
}
