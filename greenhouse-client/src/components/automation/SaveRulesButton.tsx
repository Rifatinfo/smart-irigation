'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAutomation } from './AutomationProvider'

export function SaveRulesButton() {
  const { dirty, saved, save } = useAutomation()
  return (
    <PrimaryButton disabled={!dirty} onClick={save}>
      {saved && <Check className="h-4 w-4" />}
      {saved ? 'Sent to controller' : 'Save & send to controller'}
    </PrimaryButton>
  )
}
