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
    <nav className="relative z-10 flex flex-1 flex-col gap-1.5 px-3 md:px-[18px]">
      {NAV_ITEMS.map(({ href, label, icon, Icon, iconSize }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={`group relative flex h-11 w-full items-center gap-3 rounded-2xl text-left transition-colors duration-150 ${
              collapsed ? 'justify-center px-0' : 'px-2.5'
            } ${
              active ? 'bg-leaf font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(29,138,58,0.08)]' : 'font-medium text-ink/80 hover:bg-mint hover:text-ink'
            }`}
          >
            {/* Fixed 28px slot keeps labels aligned whatever the icon's size */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center">
              {icon ? (
                <Image src={icon} alt="" width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
              ) : (
                Icon && <Icon className="text-forest" style={{ width: iconSize, height: iconSize }} strokeWidth={1.75} />
              )}
            </span>
            {!collapsed && <span className="flex-1 whitespace-nowrap text-[15px]">{label}</span>}
            {collapsed && <SidebarTooltip>{label}</SidebarTooltip>}
          </Link>
        )
      })}
    </nav>
  )
}
