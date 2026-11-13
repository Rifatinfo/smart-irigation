'use client'

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Point } from '@/lib/data'

type Props = {
  data: Point[]
  color: string
  unit: string
  format: (v: number) => string
  formatX: (d: Date) => string
  formatTip: (d: Date) => string
  /** peak: marks the high point · grid: hourly columns · points: dots on each labelled hour */
  variant: 'peak' | 'grid' | 'points'
  height?: number
  /** From the md breakpoint up, stretch to the parent's height instead of using `height` (which still applies on phones). */
  fill?: boolean
  yMin?: number
  yMax?: number
}

export function SensorLineChart({ data, color, unit, format, formatX, formatTip, variant, height: fixedHeight = 210, fill, yMin, yMax }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(480)
  const [height, setHeight] = useState(fixedHeight)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => {
      setWidth(e.contentRect.width)
      if (fill) setHeight(Math.max(90, e.contentRect.height))
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [fill])

  const padL = 44
  const padR = 10
  const padT = 22
  const padB = 28
  const w = Math.max(10, width - padL - padR)
  const h = height - padT - padB

  const { lo, hi, ticks } = useMemo(() => {
    if (!data.length) return { lo: 0, hi: 1, ticks: [] as number[] }
    const vals = data.map((d) => d.v)
    let lo = yMin ?? Math.min(...vals)
    let hi = yMax ?? Math.max(...vals)
    const pad = (hi - lo) * 0.12 || 1
    if (yMin === undefined) lo -= pad
    if (yMax === undefined) hi += pad
    const step = niceStep((hi - lo) / 4)
    lo = Math.floor(lo / step) * step
    hi = Math.ceil(hi / step) * step
    const ticks: number[] = []
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6))
    return { lo, hi, ticks }
  }, [data, yMin, yMax])

  if (data.length < 2) {
    return (
      <div
        ref={ref}
        className={`flex w-full items-center justify-center rounded-xl bg-sunken/60 text-[13px] text-faint ${fill ? 'h-[210px] md:h-full' : ''}`}
        style={fill ? undefined : { height }}
      >
        Chart appears after a few readings
      </div>
    )
  }

  const t0 = data[0]?.t.getTime() ?? 0
  const t1 = data[data.length - 1]?.t.getTime() ?? 1
  const x = (t: Date) => padL + ((t.getTime() - t0) / (t1 - t0 || 1)) * w
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * h

  const pts = data.map((d) => [x(d.t), y(d.v)] as [number, number])
  const line = smoothPath(pts)
  const area = pts.length ? `${line}L${pts[pts.length - 1][0]},${padT + h}L${pts[0][0]},${padT + h}Z` : ''

  const xTickCount = Math.max(3, Math.min(7, Math.floor(w / 72)))
  // unique indices: with only a few points several ticks would land on the same one and draw overlapping labels
  const xTickIdx = [...new Set(Array.from({ length: xTickCount }, (_, i) => Math.round((i * (data.length - 1)) / (xTickCount - 1))))]

  const peakIdx = data.reduce((best, d, i) => (d.v > data[best].v ? i : best), 0)

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - padL) / w))
    setHover(Math.round(ratio * (data.length - 1)))
  }
  const hp = hover !== null ? data[hover] : null
  const glow = `drop-shadow(0 5px 5px color-mix(in srgb, ${color} 30%, transparent))`

  return (
    <div
      ref={ref}
      className={`relative w-full select-none ${fill ? 'h-[210px] md:h-full' : ''}`}
      style={fill ? undefined : { height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={width} height={height} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray="3 4" />
            <text x={padL - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[11px] tabular">
              {format(t)}
            </text>
          </g>
        ))}

        {variant === 'grid' &&
          xTickIdx.map((i) => (
            <line key={i} x1={pts[i][0]} x2={pts[i][0]} y1={padT} y2={padT + h} stroke="var(--color-line)" strokeDasharray="3 4" />
          ))}

        <path d={area} fill={color} opacity={variant === 'grid' ? 0.16 : 0.08} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={variant === 'peak' ? 3.5 : 2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: glow }}
        />

        {variant === 'points' &&
          xTickIdx.map((i) => <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r={4} fill="var(--color-surface)" stroke={color} strokeWidth={2} />)}

        {variant === 'peak' && pts[peakIdx] && (
          <g>
            <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r={7} fill="var(--color-surface)" stroke={color} strokeWidth={2.5} />
            <text x={pts[peakIdx][0]} y={pts[peakIdx][1] - 14} textAnchor="middle" className="fill-ink text-[11px] font-semibold tabular">
              {format(data[peakIdx].v)} {unit}
            </text>
          </g>
        )}

        {xTickIdx.map((i, k) => (
          <text
            key={i}
            x={pts[i][0]}
            y={height - 6}
            textAnchor={k === 0 ? 'start' : k === xTickIdx.length - 1 ? 'end' : 'middle'}
            className="fill-faint text-[11px] tabular"
          >
            {formatX(data[i].t)}
          </text>
        ))}

        {hp && hover !== null && (
          <g>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={padT} y2={padT + h} stroke="var(--color-ink)" opacity={0.18} />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill="var(--color-surface)" stroke={color} strokeWidth={2.5} />
          </g>
        )}
      </svg>

      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg bg-forest-deep px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: Math.min(Math.max(pts[hover][0], 60), width - 60), transform: 'translate(-50%, -12px)' }}
        >
          <div className="text-white/60">{formatTip(hp.t)}</div>
          <div className="mt-0.5 whitespace-nowrap text-sm font-semibold tabular">
            {format(hp.v)} {unit}
          </div>
        </div>
      )}
    </div>
  )
}

/** Catmull-Rom curve, with control points clamped between neighbours so it never overshoots (light stays at 0 overnight). */
function smoothPath(p: [number, number][]) {
  if (!p.length) return ''
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i]
    const b = p[i]
    const c = p[i + 1]
    const e = p[i + 2] ?? c
    const loY = Math.min(b[1], c[1])
    const hiY = Math.max(b[1], c[1])
    const clamp = (v: number) => Math.min(hiY, Math.max(loY, v))
    const c1x = b[0] + (c[0] - a[0]) / 6
    const c1y = clamp(b[1] + (c[1] - a[1]) / 6)
    const c2x = c[0] - (e[0] - b[0]) / 6
    const c2y = clamp(c[1] - (e[1] - b[1]) / 6)
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`
  }
  return d
}

function niceStep(raw: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const f = raw / exp
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  return nice * exp
}
