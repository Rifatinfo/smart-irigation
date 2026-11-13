import type React from 'react'

/**
 * Sidebar routes. `icon` is an image in /public/icons; `iconSize` is its drawn size in px.
 * Routes without artwork use a lucide icon (`Icon`) instead.
 */
export type NavItem = { href: string; label: string; icon?: string; Icon?: React.ElementType; iconSize: number }

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '/icons/1.png', iconSize: 22 },
  // These three artworks fill less of their square than the dashboard tile, so they are drawn larger
  { href: '/sensors', label: 'Sensor history', icon: '/icons/4.png', iconSize: 28 },
  { href: '/automation', label: 'Automation', icon: '/icons/3.png', iconSize: 28 },
  { href: '/activity', label: 'Alerts & activity', icon: '/icons/Mint%20Activity%20Clock%20Document%20Icon.png', iconSize: 26 },
  { href: '/settings', label: 'Settings', icon: '/icons/2.png', iconSize: 28 },
]
