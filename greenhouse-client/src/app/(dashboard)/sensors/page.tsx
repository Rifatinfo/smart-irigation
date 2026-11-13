import type { Metadata } from 'next'
import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'
import { ExportCsvButton } from '@/components/sensors/ExportCsvButton'
import { RangeSelect } from '@/components/sensors/RangeSelect'
import { SensorChartGrid } from '@/components/sensors/SensorChartGrid'
import { SensorRangeProvider } from '@/components/sensors/SensorRangeProvider'
import { SensorSummaryTable } from '@/components/sensors/SensorSummaryTable'
import { SensorsSubtitle } from '@/components/sensors/SensorsSubtitle'

export const metadata: Metadata = { title: 'Sensor history' }

export default function SensorsPage() {
  return (
    <SensorRangeProvider>
      <PageHeader
        title="Sensor history"
        subtitle={<SensorsSubtitle />}
        actions={
          <>
            <RangeSelect />
            <ExportCsvButton />
          </>
        }
      />
      <PageContent>
        <SensorSummaryTable />
        <SensorChartGrid />
      </PageContent>
    </SensorRangeProvider>
  )
}
