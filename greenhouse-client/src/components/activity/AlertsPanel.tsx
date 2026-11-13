'use client'

import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, Leaf, Loader2, OctagonAlert, ShieldCheck } from 'lucide-react'
import { alertState } from '@/components/layout/NotificationBell'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { Segmented } from '@/components/ui/Segmented'
import { api, errorMessage, type Alert } from '@/lib/api'

type Filter = 'active' | 'all' | 'resolved'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]
const PAGE = 15

export function AlertsPanel() {
  const { alertsVersion, acknowledge, summary } = useGreenhouse()
  const [filter, setFilter] = useState<Filter>('active')
  const [items, setItems] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(PAGE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .alerts(filter, 1, limit)
      .then((r) => {
        if (cancelled) return
        setItems(r.items)
        setTotal(r.meta.total)
        setError('')
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filter, limit, alertsVersion])

  const run = async (id: string | 'all', fn: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const activeCount = summary.alerts.activeCount

  return (
    <Panel>
      <PanelHeader
        title="Alerts"
        meta={activeCount ? `${activeCount} need${activeCount === 1 ? 's' : ''} attention` : 'Nothing needs attention right now'}
      >
        <div className="flex items-center gap-3">
          {activeCount > 1 && (
            <button
              onClick={() => run('all', api.acknowledgeAll)}
              disabled={busy === 'all'}
              className="text-[13px] font-medium text-forest hover:underline disabled:opacity-50"
            >
              Acknowledge all
            </button>
          )}
          <Segmented<Filter>
            value={filter}
            onChange={(f) => {
              setFilter(f)
              setLimit(PAGE)
            }}
            options={FILTERS}
          />
        </div>
      </PanelHeader>
      {error && <p className="px-6 pt-3 text-[13px] text-danger">{error}</p>}
      <ul className="mt-4 divide-y divide-line border-t border-line">
        {items.map((a) => {
          const resolved = a.status === 'RESOLVED'
          const Icon = resolved ? CheckCircle2 : a.severity === 'CRITICAL' ? OctagonAlert : AlertTriangle
          const cls = resolved ? 'bg-sunken text-muted' : a.severity === 'CRITICAL' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'
          return (
            <li key={a.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5 md:px-6">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.message}</p>
                <p className="mt-1 text-xs text-faint">
                  Opened {format(new Date(a.openedAt), 'EEE d MMM, HH:mm')} · {alertState(a)}
                </p>
              </div>
              {a.status === 'ACTIVE' && (
                <button
                  onClick={() => run(a.id, () => acknowledge(a.id))}
                  disabled={busy === a.id}
                  className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunken disabled:opacity-60"
                >
                  {busy === a.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {a.type === 'HIGH_TEMPERATURE' ? 'Silence buzzer' : 'Acknowledge'}
                </button>
              )}
            </li>
          )
        })}
        {!items.length && !loading && (
          <li className="flex flex-col items-center px-6 py-8 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center">
              <Leaf className="absolute -left-5 bottom-0 h-7 w-7 -rotate-12 text-forest/35" />
              <Leaf className="absolute -right-5 bottom-0 h-7 w-7 rotate-[100deg] text-forest/35" />
              <ShieldCheck className="h-14 w-14 fill-forest text-white" strokeWidth={1.75} />
            </span>
            <span className="mt-3 text-sm text-muted">
              {filter === 'active' ? 'No open alerts. All readings are within their limits.' : 'No alerts yet.'}
            </span>
          </li>
        )}
      </ul>
      {items.length < total && (
        <div className="border-t border-line px-6 py-3 text-center">
          <button onClick={() => setLimit((l) => l + PAGE)} className="text-[13px] font-medium text-forest hover:underline">
            Show more ({total - items.length})
          </button>
        </div>
      )}
    </Panel>
  )
}
