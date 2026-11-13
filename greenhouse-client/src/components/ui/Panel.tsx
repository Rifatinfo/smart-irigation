import React from 'react'

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-line bg-surface shadow-[0_1px_2px_rgba(15,58,28,0.04),0_10px_30px_-18px_rgba(15,58,28,0.18)] ${className}`}>{children}</section>
}
