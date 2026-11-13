'use client'

import React, { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { api, errorMessage } from '@/lib/api'
import { NumberField } from './NumberField'
import { SettingRow } from './SettingRow'
import { useSettings } from './SettingsProvider'

const ZONES = ['Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC']

const inputCls =
  'h-10 w-full rounded-xl border border-line bg-sunken px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-forest focus:ring-4 focus:ring-forest/10'

function ChangePassword({ onDone }: { onDone: (changed: boolean) => void }) {
  const { user, setUser } = useGreenhouse()
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) return setError('The new password needs at least 8 characters.')
    if (newPassword !== confirm) return setError('The new passwords do not match.')
    setBusy(true)
    setError('')
    try {
      await api.changePassword(oldPassword, newPassword)
      setUser({ ...user, needPasswordChange: false })
      onDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5 px-5 pb-5 sm:grid-cols-3 md:px-6">
      <input type="password" autoComplete="current-password" placeholder="Current password" value={oldPassword} onChange={(e) => setOld(e.target.value)} className={inputCls} />
      <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={newPassword} onChange={(e) => setNew(e.target.value)} className={inputCls} />
      <input type="password" autoComplete="new-password" placeholder="Repeat new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
      <div className="flex items-center justify-end gap-3 sm:col-span-3">
        {error && <span className="mr-auto text-[13px] text-danger">{error}</span>}
        <button type="button" onClick={() => onDone(false)} className="h-9 rounded-lg px-3 text-sm font-medium text-muted hover:text-ink">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="flex h-9 items-center gap-2 rounded-lg bg-forest px-3.5 text-sm font-semibold text-white disabled:opacity-70">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Change password
        </button>
      </div>
    </form>
  )
}

export function DisplayPanel() {
  const { user } = useGreenhouse()
  const { draft, set } = useSettings()
  const [changing, setChanging] = useState(user.needPasswordChange)
  const [changed, setChanged] = useState(false)

  return (
    <Panel>
      <div className="divide-y divide-line">
        <SettingRow label="Time zone" hint="Used for the grow-light photoperiod (IANA name, e.g. Asia/Dhaka)">
          <input list="tz-list" value={draft.timezone} onChange={(e) => set('timezone', e.target.value)} className={`${inputCls} sm:w-56`} />
          <datalist id="tz-list">
            {ZONES.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </SettingRow>
        <SettingRow label="Keep data for" hint="Readings, logs and resolved alerts older than this are deleted automatically">
          <NumberField label="Data retention" value={draft.dataRetentionDays} min={1} max={3650} unit="days" onChange={(v) => set('dataRetentionDays', Math.round(v))} />
        </SettingRow>
        <div>
          <SettingRow
            label="Account"
            hint={
              user.needPasswordChange
                ? 'You are signed in with a generated password — please choose your own.'
                : `${user.name ?? user.email ?? 'Administrator'}${user.email ? ` · ${user.email}` : ''}`
            }
          >
            {changed && !changing ? (
              <span className="flex items-center gap-1.5 text-sm text-ok">
                <Check className="h-4 w-4" /> Password changed
              </span>
            ) : (
              !changing && (
                <button
                  onClick={() => setChanging(true)}
                  className="h-9 whitespace-nowrap rounded-lg border border-line px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunken"
                >
                  Change password
                </button>
              )
            )}
          </SettingRow>
          {changing && (
            <ChangePassword
              onDone={(ok) => {
                setChanging(false)
                setChanged(ok)
              }}
            />
          )}
        </div>
      </div>
    </Panel>
  )
}

