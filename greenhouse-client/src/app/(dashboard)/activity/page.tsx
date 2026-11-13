import type { Metadata } from 'next'
import { ActivityLogPanel } from '@/components/activity/ActivityLogPanel'
import { AlertsPanel } from '@/components/activity/AlertsPanel'
import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'

export const metadata: Metadata = { title: 'Alerts & activity' }

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Alerts & activity" subtitle="" />
      <PageContent>
        <div className="space-y-5">
          <AlertsPanel />
          <ActivityLogPanel />
        </div>
      </PageContent>
    </>
  )
}
