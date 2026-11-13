import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/** Small green "Edit rules →" / "View all →" link used in panel headers. */
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-forest hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}
