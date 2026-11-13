'use client'

import React, { useState } from 'react'
import { Check, Download } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function ExportCsvButton() {
  const [exported, setExported] = useState(false)

  const exportCsv = () => {
    setExported(true)
    setTimeout(() => setExported(false), 1800)
  }

  return (
    <PrimaryButton onClick={exportCsv}>
      {exported ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      {exported ? 'Exported' : 'Export CSV'}
    </PrimaryButton>
  )
}
