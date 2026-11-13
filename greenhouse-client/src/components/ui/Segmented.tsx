'use client'

import React from 'react'

export type SegmentedOption<T extends string> = { value: T; label: string }

/** Row of pill buttons; the selected one is solid green. */
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
    <div className="inline-flex shrink-0 flex-wrap gap-1.5" role="group">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`h-9 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ${
              active
                ? 'border-forest bg-forest text-white shadow-[0_6px_14px_-8px_rgba(29,138,58,0.8)]'
                : 'border-line bg-surface text-ink/80 hover:border-edge hover:bg-mint hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
