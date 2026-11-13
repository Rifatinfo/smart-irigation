import React from 'react'
import Image from 'next/image'

/** The Verdant logo (public/icons/logo.png). */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icons/logo.png"
      alt="Verdant"
      width={size}
      height={size}
      priority
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}
