import { AppShell } from '@/components/layout/AppShell'

/** Every signed-in page shares the sidebar shell; it stays mounted across navigations. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
