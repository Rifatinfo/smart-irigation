import React from 'react'
import { BrandMark } from '@/components/ui/BrandMark'

export function LoginBrand() {
  return (
    <div className="absolute left-6 top-6 z-10 flex items-center gap-3 text-white sm:left-10 sm:top-8">
      <BrandMark />
      <div className="leading-tight">
        <div className="font-display text-lg">Verdant</div>
        <div className="text-xs text-white/70">Greenhouse Controller</div>
      </div>
    </div>
  )
}
