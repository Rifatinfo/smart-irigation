'use client'

import React, { useState } from 'react'
import { AlertCircle, Check, Download, Loader2 } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { api, errorMessage } from '@/lib/api'
import { useSensorRange } from './SensorRangeProvider'

/** Downloads the stored readings for the selected range as CSV (1-min / 10-min / 1-h resolution). */
export function ExportCsvButton() {
  const { range } = useSensorRange()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const exportCsv = async () => {
    setState('busy')
    try {
      const { blob, name } = await api.downloadCsv(range)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setState('done')
    } catch (e) {
      setError(errorMessage(e))
      setState('error')
    }
    setTimeout(() => setState('idle'), 2200)
  }

  return (
    <span title={state === 'error' ? error : undefined}>
      <PrimaryButton onClick={exportCsv} disabled={state === 'busy'}>
        {state === 'busy' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === 'done' ? (
          <Check className="h-4 w-4" />
        ) : state === 'error' ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {state === 'done' ? 'Exported' : state === 'error' ? 'Export failed' : 'Export CSV'}
      </PrimaryButton>
    </span>
  )
}
