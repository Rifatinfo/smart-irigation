import type { Metadata } from 'next'
import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'
import { CalibrationPanel } from '@/components/settings/CalibrationPanel'
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
        subtitle=""
        actions={<SaveSettingsButton />}
      />
      <PageContent>
        <div className="mx-auto max-w-4xl space-y-5">
          <ControllerPanel />
          <CalibrationPanel />
          <NotificationsPanel />
          <DisplayPanel />
        </div>
      </PageContent>
    </SettingsProvider>
  )
}
