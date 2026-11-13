'use client'

import React from 'react'

/** The solid forest-green button used for the Save / Export actions in page headers. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-forest px-5 shadow-[0_6px_16px_-8px_rgba(29,138,58,0.7)] text-sm font-semibold text-white transition-[background-color,opacity,transform] duration-150 hover:bg-forest-hover active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-forest"
    >
      {children}
    </button>
  )
}
