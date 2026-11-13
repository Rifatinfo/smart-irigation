'use client'

import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useGreenhouse } from '@/components/providers/GreenhouseProvider'
import { Panel } from '@/components/ui/Panel'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { Segmented } from '@/components/ui/Segmented'
import { api, errorMessage, type LogLevel, type LogRow, type LogSource } from '@/lib/api'
import { toActivity } from '@/lib/data'
import { ActivityItem } from './ActivityItem'

type SourceFilter = 'ALL' | LogSource
const SOURCES: { value: SourceFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PUMP', label: 'Pump' },
  { value: 'GROW_LIGHT', label: 'Grow light' },
  { value: 'BUZZER', label: 'Buzzer' },
  { value: 'ALERT', label: 'Alerts' },
  { value: 'DEVICE', label: 'Controller' },
  { value: 'SETTINGS', label: 'Settings' },
]

type LevelFilter = 'ALL' | LogLevel
const LEVELS: { value: LevelFilter; label: string }[] = [
  { value: 'ALL', label: 'Any level' },
  { value: 'WARNING', label: 'Warnings' },
  { value: 'CRITICAL', label: 'Critical' },
]

const PAGE = 30

/** The full system activity log with filters. New rows arrive live from the realtime stream. */
export function ActivityLogPanel() {
  const { summary } = useGreenhouse()
  const [source, setSource] = useState<SourceFilter>('ALL')
  const [level, setLevel] = useState<LevelFilter>('ALL')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // debounce the search box
  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 350)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .logs({
        page,
        limit: PAGE,
        source: source === 'ALL' ? undefined : source,
        level: level === 'ALL' ? undefined : level,
        q: query || undefined,
      })
      .then((r) => {
        if (cancelled) return
        setRows((prev) => (page === 1 ? r.items : [...prev, ...r.items.filter((x) => !prev.some((p) => p.id === x.id))]))
        setTotal(r.meta.total)
        setError('')
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [page, source, level, query])

  // Prepend live rows that match the current filters
  const newest = summary.recentLogs[0]
  useEffect(() => {
    if (!newest || page !== 1 || query) return
    if (source !== 'ALL' && newest.source !== source) return
    if (level !== 'ALL' && newest.level !== level) return
    setRows((prev) => {
      if (prev.some((r) => r.id === newest.id)) return prev
      setTotal((t) => t + 1)
      return [newest, ...prev]
    })
  }, [newest, page, source, level, query])

  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }

  return (
    <Panel>
      <PanelHeader title="Activity log" meta={`${total.toLocaleString('en-US')} event${total === 1 ? '' : 's'}`}>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-sunken px-3 focus-within:border-forest">
          <Search className="h-4 w-4 text-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search…"
            className="w-36 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
      </PanelHeader>
      <div className="mt-4 flex flex-wrap gap-3 px-5 md:px-6">
        <div className="max-w-full overflow-x-auto">
          <Segmented<SourceFilter> value={source} onChange={(v) => reset(() => setSource(v))} options={SOURCES} />
        </div>
        <Segmented<LevelFilter> value={level} onChange={(v) => reset(() => setLevel(v))} options={LEVELS} />
      </div>
      {error && <p className="px-6 pt-3 text-[13px] text-danger">{error}</p>}
      <ol className="mt-5 px-5 md:px-6">
        {rows.map((r, i) => (
          <ActivityItem key={r.id} activity={toActivity(r)} last={i === rows.length - 1} />
        ))}
        {!rows.length && !loading && <li className="py-8 text-center text-[13px] text-faint">No matching events.</li>}
      </ol>
      {rows.length < total && (
        <div className="border-t border-line px-6 py-3 text-center">
          <button onClick={() => setPage((p) => p + 1)} disabled={loading} className="text-[13px] font-medium text-forest hover:underline disabled:opacity-50">
            {loading ? 'Loading…' : `Load older events (${total - rows.length})`}
          </button>
        </div>
      )}
    </Panel>
  )
}
