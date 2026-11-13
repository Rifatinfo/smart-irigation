'use client'

import { RANGE_LABEL } from '@/lib/sensor-history'
import { useSensorRange } from './SensorRangeProvider'

export function SensorsSubtitle() {
  const { range, history, loading, error } = useSensorRange()
  if (error) return <span className="text-danger">{error}</span>
  const samples = history && !loading ? ` · ${history.totals.samples.toLocaleString('en-US')} readings` : ''
  return <>{`Readings stored in the database, ${RANGE_LABEL[range]}${samples}`}</>
}
