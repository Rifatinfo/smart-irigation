import React from 'react'

/** Bordered input row with a leading icon, used by the sign-in form. */
export function FormField({
  label,
  icon: Icon,
  children,
}: {
  label: React.ReactNode
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <label className="block">
      {label}
      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-sunken px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-forest focus-within:ring-4 focus-within:ring-forest/10">
        <Icon className="h-4 w-4 shrink-0 text-faint" />
        {children}
      </div>
    </label>
  )
}
