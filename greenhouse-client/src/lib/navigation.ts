/** Sidebar routes. `icon` is an image in /public/icons; `iconSize` is its drawn size in px. */
export type NavItem = { href: string; label: string; icon: string; iconSize: number }

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '/icons/1.png', iconSize: 22 },
  // These three artworks fill less of their square than the dashboard tile, so they are drawn larger
  { href: '/sensors', label: 'Sensor history', icon: '/icons/4.png', iconSize: 28 },
  { href: '/automation', label: 'Automation', icon: '/icons/3.png', iconSize: 28 },
  { href: '/settings', label: 'Settings', icon: '/icons/2.png', iconSize: 28 },
]
