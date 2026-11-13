import type { Metadata } from 'next'
import { format } from 'date-fns'
import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'
import { AutomaticDevicesPanel } from '@/components/dashboard/AutomaticDevicesPanel'
import { ClimateCard } from '@/components/dashboard/ClimateCard'
import { HeatAlarmBanner } from '@/components/dashboard/HeatAlarmBanner'
import { LiveReadingsProvider, type DashboardState } from '@/components/dashboard/LiveReadingsProvider'
import { RecentActivityPanel } from '@/components/dashboard/RecentActivityPanel'
import { SoilMoistureCard } from '@/components/dashboard/SoilMoistureCard'
import { SyncStatus } from '@/components/dashboard/SyncStatus'
import { TrendsPanel } from '@/components/dashboard/TrendsPanel'
import { WeekPanel } from '@/components/dashboard/WeekPanel'
import { NOW } from '@/lib/data'

export const metadata: Metadata = { title: 'Dashboard' }

const STATES: DashboardState[] = ['default', 'watering', 'heat-alarm']

type Props = { searchParams: Promise<{ state?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  const { state } = await searchParams
  const scenario = STATES.find((s) => s === state) ?? 'default'

  return (
    <LiveReadingsProvider state={scenario}>
      <PageHeader
        title=""
        subtitle={`${format(NOW, 'EEEE d MMMM')}`}
        actions={<SyncStatus />}
      />
      <PageContent>
        <HeatAlarmBanner />

        {/* Row 1 — what the plants feel right now. From tablet up, the four cards exactly fill the visible
            area below the header (100cqh of <PageContent> minus its 2×2rem padding), so all four are seen at a glance. */}
        <div className="grid grid-cols-1 gap-5 md:h-[calc(100cqh-4rem)] md:min-h-[460px] md:grid-cols-2 md:grid-rows-2">
          <SoilMoistureCard />
          <ClimateCard metric="temperature" />
          <ClimateCard metric="humidity" />
          <ClimateCard metric="light" />
        </div>

        {/* Row 2 — automatic devices */}
        <AutomaticDevicesPanel />

        {/* Row 3 — trends and activity */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <TrendsPanel />
          <RecentActivityPanel />
        </div>

        {/* Row 4 — weekly resource use */}
        <WeekPanel />
      </PageContent>
    </LiveReadingsProvider>
  )
}
