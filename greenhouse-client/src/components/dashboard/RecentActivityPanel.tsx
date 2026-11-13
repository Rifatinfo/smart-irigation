'use client'

import React from 'react'
import { ActivityItem } from '@/components/activity/ActivityItem'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { TextLink } from '@/components/ui/TextLink'
import { toActivity } from '@/lib/data'
import { useLiveReadings } from './LiveReadingsProvider'

export function RecentActivityPanel() {
  const { summary } = useLiveReadings()
  const recent = summary.recentLogs.slice(0, 6).map(toActivity)
  return (
    <Panel className="flex flex-col lg:col-span-4">
      <PanelHeader title="Recent activity">
        <TextLink href="/activity">View all</TextLink>
      </PanelHeader>
      {recent.length ? (
        <ol className="mt-3 flex-1 px-5 pb-4 md:px-6">
          {recent.map((a, i) => (
            <ActivityItem key={a.id} activity={a} last={i === recent.length - 1} compact />
          ))}
        </ol>
      ) : (
        <p className="flex flex-1 items-center justify-center px-6 py-10 text-center text-[13px] text-faint">
          Device switches, alerts and settings changes will appear here.
        </p>
      )}
    </Panel>
  )
}
