import React from 'react'
import Image from 'next/image'
import { initials } from '@/lib/user'

/** Round profile photo; falls back to initials when there is no photo. */
export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    return <Image src={src} alt={name} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-forest font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  )
}
