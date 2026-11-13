'use client'

import { RANGE_LABEL } from '@/lib/sensor-history'
import { useSensorRange } from './SensorRangeProvider'

export function SensorsSubtitle() {
  const { range } = useSensorRange()
  return <>{`Readings stored in the cloud, ${RANGE_LABEL[range]}`}</>
}
