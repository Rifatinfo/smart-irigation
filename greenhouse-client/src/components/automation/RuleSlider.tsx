'use client'

import React from 'react'

type Props = {
  label: string
  unit: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  format?: (v: number) => string
}

export function RuleSlider({ label, unit, min, max, step = 1, value, onChange, format }: Props) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-sm font-semibold tabular text-forest">
          {format ? format(value) : value}
          {unit && <span className="ml-0.5 font-normal text-muted">{unit === '%' ? '%' : ` ${unit}`}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2.5 h-1.5 w-full cursor-pointer accent-forest"
      />
    </label>
  )
}
