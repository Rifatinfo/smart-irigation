'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronUp, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { CURRENT_USER as user } from '@/lib/user'
import { SidebarTooltip } from './SidebarTooltip'

/** Account button at the bottom of the sidebar; opens a menu with the user's photo, name, email and Log out. */
export function SidebarAccount({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative border-t border-edge px-3 py-3">
      {open && (
        <div
          role="menu"
          // Above the button when the sidebar is open; beside the rail when it is collapsed
          className={`absolute z-50 overflow-hidden rounded-xl border border-edge bg-surface shadow-[0_16px_40px_-12px_rgba(22,33,27,0.28)] ${
            collapsed ? 'bottom-3 left-full ml-2 w-[240px]' : 'bottom-full left-2 right-2 mb-1'
          }`}
        >
          <div className="flex items-center gap-3 px-3 py-3.5">
            <Avatar name={user.name} src={user.avatar} size={36} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
              <div className="mt-0.5 truncate text-[13px] text-muted">{user.email}</div>
            </div>
          </div>
          <div className="border-t border-line p-1.5">
            <Link
              href="/login"
              role="menuitem"
              className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger-soft"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              Log out
            </Link>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        className={`group relative flex h-12 w-full items-center gap-2.5 rounded-xl px-1.5 text-left transition-colors duration-150 hover:bg-ink/5 ${
          open ? 'bg-ink/5' : ''
        } ${collapsed ? 'justify-center' : ''}`}
      >
        <Avatar name={user.name} src={user.avatar} size={32} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm">
              <span className="font-semibold text-ink">{user.name}</span>
              <span className="text-muted"> · {user.role}</span>
            </span>
            <ChevronUp className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${open ? '' : 'rotate-180'}`} />
          </>
        )}
        {collapsed && !open && <SidebarTooltip>{user.name}</SidebarTooltip>}
      </button>
    </div>
  )
}
