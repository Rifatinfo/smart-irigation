import React from 'react'

const TONES = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-sunken text-muted',
  active: 'bg-forest text-white',
}

export type StatusTone = keyof typeof TONES

export function StatusPill({ tone, children, dot = true }: { tone: StatusTone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
