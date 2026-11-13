import type { Metadata } from 'next'
import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'
import { AutomationProvider } from '@/components/automation/AutomationProvider'
import { BuzzerRules } from '@/components/automation/BuzzerRules'
import { GrowLightRules } from '@/components/automation/GrowLightRules'
import { PumpRules } from '@/components/automation/PumpRules'
import { PumpRunsTable } from '@/components/automation/PumpRunsTable'
import { SaveRulesButton } from '@/components/automation/SaveRulesButton'

export const metadata: Metadata = { title: 'Automation' }

export default function AutomationPage() {
  return (
    <AutomationProvider>
      <PageHeader
        title="Automation"
        subtitle="Rules the controller follows to switch the pump, grow light and buzzer"
        actions={<SaveRulesButton />}
      />
      <PageContent>
        <div className="space-y-5">
          <PumpRules />
          <GrowLightRules />
          <BuzzerRules />
          <PumpRunsTable />
        </div>
      </PageContent>
    </AutomationProvider>
  )
}
