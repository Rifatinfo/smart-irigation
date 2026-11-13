import React from 'react'
import { BrandMark } from '@/components/ui/BrandMark'

export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-[72px] shrink-0 items-center gap-3 px-3 md:px-[18px]">
      <BrandMark size={40} />
      {!collapsed && (
        <div className="min-w-0 whitespace-nowrap leading-tight">
          <div className="font-display text-[17px]">Verdant</div>
        </div>
      )}
    </div>
  )
}
