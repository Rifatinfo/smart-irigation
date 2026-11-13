export const round = (n: number, dp = 1) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Capacitive soil sensor: ADC raw -> % volumetric water (linear between dry/wet calibration points). */
export function soilRawToPercent(raw: number, rawDry: number, rawWet: number): number | null {
  if (!Number.isFinite(raw) || rawDry === rawWet) return null;
  // Wildly out-of-range raw values mean a disconnected / shorted sensor, not "very wet/dry".
  const span = Math.abs(rawDry - rawWet);
  const lo = Math.min(rawDry, rawWet) - span * 0.25;
  const hi = Math.max(rawDry, rawWet) + span * 0.25;
  if (raw < lo || raw > hi) return null;
  const pct = ((rawDry - raw) / (rawDry - rawWet)) * 100;
  return round(Math.min(100, Math.max(0, pct)), 1);
}

export interface Point {
  t: number; // ms epoch
  v: number;
}

/** Least-squares slope in units per hour. */
export function slopePerHour(points: Point[]): number | null {
  if (points.length < 4) return null;
  const n = points.length;
  const t0 = points[0].t;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of points) {
    const x = (p.t - t0) / 3_600_000;
    sx += x; sy += p.v; sxy += x * p.v; sxx += x * x;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  return (n * sxy - sx * sy) / denom;
}

/**
 * Hours until the soil dries down to the pump threshold, from the recent drying trend.
 * 0 = due now, null = not drying / not enough data.
 */
export function etaToThresholdHours(current: number | null, threshold: number, slope: number | null): number | null {
  if (current === null) return null;
  if (current <= threshold) return 0;
  if (slope === null || slope > -0.05) return null; // flat or rising: no estimate
  const h = (current - threshold) / -slope;
  return h > 24 * 14 ? null : h;
}
