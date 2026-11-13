import React from 'react'
import { ControllerPill } from './ControllerPill'
import { NotificationBell } from './NotificationBell'
import { PageIcon } from './PageIcon'
import { SidebarToggle } from './sidebar/SidebarToggle'

type Props = {
  title?: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-surface/70 px-5 py-4 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <SidebarToggle />
        {title && <PageIcon />}
        <div className="min-w-0 flex-1">
          {title && <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink md:text-[28px]">{title}</h1>}
          {subtitle && <p className={`text-sm text-muted ${title ? 'mt-0.5' : 'font-medium'}`}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <ControllerPill />
        <NotificationBell />
      </div>
    </header>
  )
}
