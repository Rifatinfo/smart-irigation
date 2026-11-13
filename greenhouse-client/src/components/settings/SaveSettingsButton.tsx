'use client'

import React from 'react'
import { Check, Loader2 } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useSettings } from './SettingsProvider'

export function SaveSettingsButton() {
  const { saved, saving, dirty, error, save } = useSettings()
  return (
    <div className="flex flex-wrap items-center gap-3">
      {error && (
        <span role="alert" className="max-w-xs text-[13px] text-danger">
          {error}
        </span>
      )}
      <PrimaryButton onClick={save} disabled={!dirty || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved && !dirty && <Check className="h-4 w-4" />}
        {saving ? 'Saving…' : saved && !dirty ? 'Saved' : 'Save settings'}
      </PrimaryButton>
    </div>
  )
}
