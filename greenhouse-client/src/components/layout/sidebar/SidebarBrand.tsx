import React from 'react'
import { BrandMark } from '@/components/ui/BrandMark'

export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="relative flex h-[84px] shrink-0 items-center gap-3 px-3 md:px-[18px]">
      <BrandMark size={collapsed ? 40 : 44} />
      {!collapsed && (
        <div className="min-w-0 whitespace-nowrap text-[19px] font-bold leading-[1.1] tracking-tight">
          <div className="text-ink">Greenhouse</div>
          <div className="text-forest">Controller</div>
        </div>
      )}
    </div>
  )
}
