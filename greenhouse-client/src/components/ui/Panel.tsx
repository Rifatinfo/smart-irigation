import React from 'react'

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</section>
}
