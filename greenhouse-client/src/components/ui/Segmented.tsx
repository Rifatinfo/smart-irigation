'use client'

import React from 'react'

export type SegmentedOption<T extends string> = { value: T; label: string }

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex shrink-0 rounded-xl bg-sunken p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 ${
            value === o.value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
