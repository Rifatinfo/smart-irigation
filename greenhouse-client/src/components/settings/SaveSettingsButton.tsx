'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useSettings } from './SettingsProvider'

export function SaveSettingsButton() {
  const { saved, save } = useSettings()
  return (
    <PrimaryButton onClick={save}>
      {saved && <Check className="h-4 w-4" />}
      {saved ? 'Saved' : 'Save settings'}
    </PrimaryButton>
  )
}
