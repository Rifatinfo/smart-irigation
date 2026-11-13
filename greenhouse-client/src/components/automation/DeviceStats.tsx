import React from 'react'

export type DeviceStat = { label: string; value: string }

export function DeviceStats({ stats }: { stats: DeviceStat[] }) {
  return (
    <dl className="grid grid-cols-3 border-t border-line lg:col-span-4 lg:grid-cols-1 lg:border-l lg:border-t-0">
      {stats.map((s, i) => (
        <div key={s.label} className={`px-5 py-4 md:px-6 ${i ? 'border-l border-line lg:border-l-0 lg:border-t' : ''}`}>
          <dt className="text-[13px] text-muted">{s.label}</dt>
          <dd className="mt-0.5 font-semibold tabular text-ink">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
