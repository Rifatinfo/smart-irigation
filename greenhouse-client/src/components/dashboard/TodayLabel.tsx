'use client'

import { format } from 'date-fns'
import { useGreenhouse, useNow } from '@/components/providers/GreenhouseProvider'

/** "Thursday 13 November · Greenhouse-1" — rendered on the client so it is the viewer's local date. */
export function TodayLabel() {
  const now = useNow(60_000)
  const { summary } = useGreenhouse()
  return <>{`${format(now, 'EEEE d MMMM')} · ${summary.device.name}`}</>
}
