import React from 'react'
import type { MetricKey } from '@/lib/data'
import { METRIC_ICONS } from './icons'

export function MetricIcon({ metric, className = 'h-4 w-4' }: { metric: MetricKey; className?: string }) {
  const Icon = METRIC_ICONS[metric]
  return <Icon className={className} />
}
