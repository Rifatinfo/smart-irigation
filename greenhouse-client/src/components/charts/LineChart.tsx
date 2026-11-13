'use client'

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Point } from '@/lib/data'

type Props = {
  data: Point[]
  color: string
  unit: string
  format: (v: number) => string
  formatX: (d: Date) => string
  formatTip?: (d: Date) => string
  height?: number
  threshold?: { value: number; label: string }
  band?: [number, number]
  markers?: Date[]
  markerLabel?: string
  yMin?: number
  yMax?: number
  axis?: boolean
  /** Shown instead of the chart when there are fewer than two points. */
  emptyText?: string
}

export function LineChart({
  data,
  color,
  unit,
  format,
  formatX,
  formatTip,
  height = 260,
  threshold,
  band,
  markers = [],
  markerLabel,
  yMin,
  yMax,
  axis = true,
  emptyText,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const padL = axis ? 48 : 0
  const padR = axis ? 8 : 0
  const padT = 10
  const padB = axis ? 26 : 2
  const w = Math.max(10, width - padL - padR)
  const h = height - padT - padB

  const { lo, hi, ticks } = useMemo(() => {
    if (!data.length) return { lo: 0, hi: 1, ticks: [] as number[] }
    const vals = data.map((d) => d.v)
    if (threshold) vals.push(threshold.value)
    if (band) vals.push(...band)
    let lo = yMin ?? Math.min(...vals)
    let hi = yMax ?? Math.max(...vals)
    const pad = (hi - lo) * 0.08 || 1
    if (yMin === undefined) lo -= pad
    if (yMax === undefined) hi += pad
    const step = niceStep((hi - lo) / 4)
    lo = Math.floor(lo / step) * step
    hi = Math.ceil(hi / step) * step
    const ticks: number[] = []
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6))
    return { lo, hi, ticks }
  }, [data, threshold, band, yMin, yMax])

  if (data.length < 2) {
    return (
      <div ref={ref} className="flex w-full items-center justify-center rounded-xl bg-sunken/60 text-[13px] text-faint" style={{ height }}>
        {emptyText ?? 'No readings in this period yet'}
      </div>
    )
  }

  const t0 = data[0]?.t.getTime() ?? 0
  const t1 = data[data.length - 1]?.t.getTime() ?? 1
  const x = (t: Date) => padL + ((t.getTime() - t0) / (t1 - t0 || 1)) * w
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * h

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)},${y(d.v).toFixed(1)}`).join('')
  const area = data.length ? `${line}L${x(data[data.length - 1].t)},${padT + h}L${x(data[0].t)},${padT + h}Z` : ''

  const xTickCount = Math.max(2, Math.min(7, Math.floor(w / 110)))
  // unique indices: with only a few points several ticks would land on the same one and draw overlapping labels
  const xTicks = [...new Set(Array.from({ length: xTickCount }, (_, i) => Math.round((i * (data.length - 1)) / (xTickCount - 1))))].map(
    (i) => data[i],
  ).filter(Boolean)

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect()
    const px = e.clientX - rect.left - padL
    const ratio = Math.min(1, Math.max(0, px / w))
    setHover(Math.round(ratio * (data.length - 1)))
  }

  const hp = hover !== null ? data[hover] : null

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} className="block overflow-visible">
        {axis &&
          ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray="2 4" />
              <text x={padL - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[11px] tabular">
                {format(t)}
              </text>
            </g>
          ))}
        {band && (
          <rect x={padL} width={w} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill="var(--color-ok)" opacity={0.06} />
        )}
        <path d={area} fill={color} opacity={0.09} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {threshold && (
          <g>
            <line x1={padL} x2={padL + w} y1={y(threshold.value)} y2={y(threshold.value)} stroke="var(--color-danger)" strokeWidth={1.25} strokeDasharray="5 4" />
            <text x={padL + w - 4} y={y(threshold.value) - 6} textAnchor="end" className="fill-danger text-[11px] font-medium">
              {threshold.label}
            </text>
          </g>
        )}
        {markers
          .filter((m) => m.getTime() >= t0 && m.getTime() <= t1)
          .map((m) => (
            <g key={m.getTime()}>
              <line x1={x(m)} x2={x(m)} y1={padT} y2={padT + h} stroke="var(--color-humid)" strokeWidth={1} opacity={0.5} />
              <circle cx={x(m)} cy={padT + 4} r={4} fill="var(--color-humid)" stroke="white" strokeWidth={1.5} />
            </g>
          ))}
        {axis &&
          xTicks.map((d, i) => (
            <text
              key={i}
              x={x(d.t)}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="fill-faint text-[11px]"
            >
              {formatX(d.t)}
            </text>
          ))}
        {hp && (
          <g>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={padT} y2={padT + h} stroke="var(--color-ink)" opacity={0.18} />
            <circle cx={x(hp.t)} cy={y(hp.v)} r={4.5} fill="white" stroke={color} strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg bg-forest-deep px-3 py-2 text-xs text-white shadow-lg"
          style={{
            left: Math.min(Math.max(x(hp.t), 70), width - 70),
            transform: 'translate(-50%, -8px)',
          }}
        >
          <div className="text-white/60">{(formatTip ?? formatX)(hp.t)}</div>
          <div className="mt-0.5 whitespace-nowrap text-sm font-semibold tabular">
            {format(hp.v)} {unit}
          </div>
        </div>
      )}
    </div>
  )
}

function niceStep(raw: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const f = raw / exp
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  return nice * exp
}
