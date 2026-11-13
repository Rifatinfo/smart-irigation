import React from 'react'

const R = 110
const CX = 130
const CY = 130

function point(pct: number, r = R) {
  const a = Math.PI * (1 - pct / 100)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

function arc(from: number, to: number) {
  const [x1, y1] = point(from)
  const [x2, y2] = point(to)
  return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`
}

/** Half-circle gauge. `dry` / `wet` are the pump start and stop levels (the shaded healthy band). */
export function SoilGauge({ value, dry, wet }: { value: number | null; dry: number; wet: number }) {
  const v = value === null ? null : Math.max(0, Math.min(100, value))
  const isDry = v !== null && v < dry
  const ticks = [dry, wet]
  return (
    // Width-driven on phones; on larger screens it is sized by the card height (keeping its 260:150 shape)
    <div className="@container relative aspect-[260/150] w-full max-w-[300px] md:h-full md:max-h-[173px] md:w-auto">
      <svg viewBox="0 0 260 150" className="block h-full w-full overflow-visible">
        <path d={arc(0, 100)} fill="none" stroke="var(--color-sunken)" strokeWidth={20} strokeLinecap="round" />
        <path d={arc(dry, wet)} fill="none" stroke="var(--color-ok-soft)" strokeWidth={20} />
        {v !== null && (
          <path
            d={arc(0, Math.max(0.5, v))}
            fill="none"
            stroke={isDry ? 'var(--color-danger)' : 'var(--color-soil)'}
            strokeWidth={20}
            strokeLinecap="round"
            style={{ transition: 'stroke 200ms ease-out' }}
          />
        )}
        {ticks.map((t) => {
          const [x1, y1] = point(t, R - 16)
          const [x2, y2] = point(t, R + 16)
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink)" strokeWidth={2} opacity={0.55} />
        })}
        {ticks.map((t) => {
          const [x, y] = point(t, R + 28)
          return (
            <text key={`l${t}`} x={x} y={y} textAnchor="middle" dy="0.35em" className="fill-faint text-[10px] font-medium">
              {t}%
            </text>
          )
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="text-[clamp(26px,17.4cqw,52px)] font-semibold leading-none tracking-tight tabular text-ink">
          {v === null ? '—' : Math.round(v)}
          <span className="ml-0.5 text-[clamp(14px,8cqw,24px)] font-medium text-muted">%</span>
        </div>
        <div className="mt-1.5 text-xs text-muted">{v === null ? 'No reading yet' : 'Volumetric water content'}</div>
      </div>
    </div>
  )
}
