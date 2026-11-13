import React from 'react'

type Bar = { label: string; value: number; text: string }

/** Seven-day bar chart; the last bar is today and drawn at full opacity. */
export function DailyBarChart({ title, total, color, data }: { title: string; total: string; color: string; data: Bar[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <span className="text-[13px] tabular text-muted">{total}</span>
      </div>
      <div className="mt-4 flex h-40 items-end gap-2 sm:gap-3">
        {data.map((d, i) => {
          const today = i === data.length - 1
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-medium tabular text-muted">{d.text}</span>
                <div
                  className="w-full max-w-10 rounded-md"
                  style={{ height: `${Math.max(3, (d.value / max) * 78)}%`, background: color, opacity: today ? 1 : 0.45 }}
                />
              </div>
              <span className={`text-xs ${today ? 'font-semibold text-ink' : 'text-faint'}`}>{today ? 'Today' : d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
