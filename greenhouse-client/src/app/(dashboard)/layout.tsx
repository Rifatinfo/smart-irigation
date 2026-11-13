import { AppShell } from '@/components/layout/AppShell'
import { GreenhouseProvider } from '@/components/providers/GreenhouseProvider'

/**
 * Every signed-in page shares the sidebar shell; it stays mounted across navigations.
 * GreenhouseProvider checks the login, loads the controller data and keeps it live for all pages.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <GreenhouseProvider>
      <AppShell>{children}</AppShell>
    </GreenhouseProvider>
  )
}
