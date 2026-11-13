import React from 'react'
import { NotificationBell } from './NotificationBell'
import { SidebarToggle } from './sidebar/SidebarToggle'

type Props = {
  title?: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-edge bg-canvas/90 px-5 py-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarToggle />
        <div className="min-w-0 flex-1">
          {title && <h1 className="font-display text-2xl leading-tight text-ink md:text-[28px]">{title}</h1>}
          {subtitle && <p className={`text-sm text-muted ${title ? 'mt-0.5' : ''}`}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <NotificationBell />
      </div>
    </header>
  )
}
