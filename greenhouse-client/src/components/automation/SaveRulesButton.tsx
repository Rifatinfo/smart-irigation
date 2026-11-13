'use client'

import React from 'react'
import { Check, Loader2 } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAutomation } from './AutomationProvider'

export function SaveRulesButton() {
  const { dirty, saved, saving, saveError, save, discard } = useAutomation()
  return (
    <div className="flex flex-wrap items-center gap-3">
      {saveError && (
        <span role="alert" className="max-w-xs text-[13px] text-danger">
          {saveError}
        </span>
      )}
      {dirty && !saving && (
        <button onClick={discard} className="text-[13px] font-medium text-muted hover:text-ink">
          Discard
        </button>
      )}
      <PrimaryButton disabled={!dirty || saving} onClick={save}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved && !dirty && <Check className="h-4 w-4" />}
        {saving ? 'Sending…' : saved && !dirty ? 'Sent to controller' : 'Save & send to controller'}
      </PrimaryButton>
    </div>
  )
}
