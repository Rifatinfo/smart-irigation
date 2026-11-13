'use client'

import React, { useEffect, useState } from 'react'

type Props = {
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  label: string
}

/** Compact number input with a unit, styled like the other settings inputs. Commits only valid numbers. */
export function NumberField({ value, onChange, unit, min, max, step = 1, label }: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  return (
    <span className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setText(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n)) onChange(n)
        }}
        onBlur={() => setText(String(value))}
        className="h-10 w-28 rounded-xl border border-line bg-sunken px-3 text-right text-sm tabular text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-forest focus:ring-4 focus:ring-forest/10"
      />
      {unit && <span className="w-10 text-[13px] text-muted">{unit}</span>}
    </span>
  )
}
