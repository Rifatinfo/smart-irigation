'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'
import { SidebarTooltip } from './SidebarTooltip'

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 md:px-[18px]">
      {NAV_ITEMS.map(({ href, label, icon, iconSize }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={`group relative flex h-10 w-full items-center gap-3 rounded-xl text-left transition-colors duration-150 ${
              collapsed ? 'justify-center px-0' : 'px-2'
            } ${
              active ? 'bg-leaf text-forest-deep' : 'text-muted hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {/* Fixed 28px slot keeps labels aligned whatever the icon's size */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center">
              <Image src={icon} alt="" width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
            </span>
            {!collapsed && <span className="flex-1 whitespace-nowrap text-sm font-medium">{label}</span>}
            {collapsed && <SidebarTooltip>{label}</SidebarTooltip>}
          </Link>
        )
      })}
    </nav>
  )
}
