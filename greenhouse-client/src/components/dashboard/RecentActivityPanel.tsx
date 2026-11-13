import React from 'react'
import { ActivityItem } from '@/components/activity/ActivityItem'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { ACTIVITY } from '@/lib/data'

export function RecentActivityPanel() {
  const recent = ACTIVITY.slice(0, 6)
  return (
    <Panel className="flex flex-col lg:col-span-4">
      <PanelHeader title="Recent activity" />
      <ol className="mt-3 flex-1 px-5 pb-4 md:px-6">
        {recent.map((a, i) => (
          <ActivityItem key={a.id} activity={a} last={i === recent.length - 1} compact />
        ))}
      </ol>
    </Panel>
  )
}
