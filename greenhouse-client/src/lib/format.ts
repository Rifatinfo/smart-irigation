/** Two-digit hour, e.g. 6 → "06". */
export function pad(n: number) {
  return String(n).padStart(2, '0')
}
