'use client'

import React, { useState } from 'react'
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Segmented } from '@/components/ui/Segmented'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { api, apiUrl, errorMessage } from '@/lib/api'
import { ControllerStatus } from './ControllerStatus'
import { SettingRow } from './SettingRow'
import { useSettings } from './SettingsProvider'

type Interval = '5' | '10' | '30' | '60' | '300'

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '5', label: '5 s' },
  { value: '10', label: '10 s' },
  { value: '30', label: '30 s' },
  { value: '60', label: '1 min' },
  { value: '300', label: '5 min' },
]

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
      aria-label="Copy"
    >
      {done ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

/** Issues a new device key. The old one stops working at once, so the firmware must be updated. */
function ApiKeyRow() {
  const { summary, setDeviceName } = useGreenhouse()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const rotate = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.rotateKey(summary.device.id)
      const { apiKey, ...device } = res
      setDeviceName(device)
      setKey(apiKey)
      setConfirming(false)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingRow
      label="Device API key"
      hint={
        key
          ? 'Copy it into DEVICE_API_KEY in the ESP32 sketch now — it is not shown again.'
          : 'The ESP32 sends it with every reading. Lost it? Issue a new one (the old key stops working).'
      }
    >
      {key ? (
        <div className="flex max-w-[min(80vw,360px)] items-center gap-1 rounded-xl border border-line bg-sunken pl-3">
          <code className="truncate text-[13px] text-ink">{key}</code>
          <CopyButton text={key} />
        </div>
      ) : confirming ? (
        <div className="flex items-center gap-2">
          <button onClick={() => setConfirming(false)} className="h-9 rounded-lg px-3 text-sm font-medium text-muted hover:text-ink">
            Cancel
          </button>
          <button
            onClick={rotate}
            disabled={busy}
            className="flex h-9 items-center gap-2 rounded-lg bg-danger px-3.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Replace key
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <code className="text-[13px] text-muted">{summary.device.apiKeyPrefix}••••••••</code>
          <button
            onClick={() => setConfirming(true)}
            className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunken"
          >
            <KeyRound className="h-4 w-4" /> New key
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
    </SettingRow>
  )
}

export function ControllerPanel() {
  const { draft, set } = useSettings()
  const server = apiUrl()
  const local = /\/\/(localhost|127\.0\.0\.1)[:/]/.test(server + '/')
  const interval = String(draft.readingIntervalSec) as Interval

  return (
    <Panel>
      <ControllerStatus />
      <div className="divide-y divide-line border-t border-line">
        <SettingRow label="Greenhouse name" hint="Shown in the header and on alerts">
          <input
            value={draft.name}
            maxLength={60}
            onChange={(e) => set('name', e.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-sunken px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-forest focus:ring-4 focus:ring-forest/10 sm:w-64"
          />
        </SettingRow>
        <SettingRow
          label="Server address"
          hint={
            local
              ? 'Readings are stored in the PostgreSQL database. In the ESP32 sketch use this PC’s LAN IP instead of localhost.'
              : 'Readings are stored in the PostgreSQL database. Put this address in SERVER_URL in the ESP32 sketch.'
          }
        >
          <div className="flex items-center gap-1 text-sm text-ink">
            <code className="text-[13px]">{server}</code>
            <CopyButton text={server} />
          </div>
        </SettingRow>
        <ApiKeyRow />
        <SettingRow
          label="Upload interval"
          hint={`How often the controller sends readings. It is marked offline after ${draft.offlineAfterSec} s without data.`}
        >
          <Segmented<Interval>
            value={INTERVALS.some((i) => i.value === interval) ? interval : '10'}
            onChange={(v) => {
              const sec = Number(v)
              set('readingIntervalSec', sec)
              set('offlineAfterSec', Math.max(60, sec * 3))
            }}
            options={INTERVALS}
          />
        </SettingRow>
      </div>
    </Panel>
  )
}
