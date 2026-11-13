'use client'

import React from 'react'
import { Switch } from '@/components/ui/Switch'

/** On/off rule option, laid out like a RuleSlider so it sits in the same grid. */
export function RuleToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{label}</div>
        <div className="mt-1 text-xs text-muted">{hint}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}
