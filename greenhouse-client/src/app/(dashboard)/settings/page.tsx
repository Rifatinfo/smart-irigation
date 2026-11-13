import type { Metadata } from 'next'
import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'
import { ControllerPanel } from '@/components/settings/ControllerPanel'
import { DisplayPanel } from '@/components/settings/DisplayPanel'
import { NotificationsPanel } from '@/components/settings/NotificationsPanel'
import { SaveSettingsButton } from '@/components/settings/SaveSettingsButton'
import { SettingsProvider } from '@/components/settings/SettingsProvider'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <SettingsProvider>
      <PageHeader
        title="Settings"
        subtitle="Controller connection, notifications and display preferences"
        actions={<SaveSettingsButton />}
      />
      <PageContent>
        <div className="mx-auto max-w-4xl space-y-5">
          <ControllerPanel />
          <NotificationsPanel />
          <DisplayPanel />
        </div>
      </PageContent>
    </SettingsProvider>
  )
}
