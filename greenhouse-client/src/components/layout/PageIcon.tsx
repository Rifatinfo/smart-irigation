'use client'

import React from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'

/** The current page's sidebar icon, shown next to the page title. */
export function PageIcon() {
  const pathname = usePathname()
  const item = NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
  if (!item) return null
  return (
    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint sm:flex">
      {item.icon ? (
        <Image src={item.icon} alt="" width={30} height={30} className="object-contain" style={{ width: 30, height: 30 }} />
      ) : (
        item.Icon && <item.Icon className="h-6 w-6 text-forest" strokeWidth={2} />
      )}
    </span>
  )
}
