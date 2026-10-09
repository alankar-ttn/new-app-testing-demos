import type { Vec3 } from "./types"

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

export function polylineLength(points: readonly Vec3[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    if (!previous || !current) continue
    total += distance(previous, current)
  }
  return total
}

export function headingBetween(a: Vec3, b: Vec3): number {
  return Math.atan2(b.x - a.x, b.z - a.z)
}

/** Wrap progress into [0, 1). A full lap returns to the start. */
export function normalizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  const wrapped = progress % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

/**
 * Move normalized progress forward. `speed` is world units per second.
 * Zero time, speed, or length leaves the truck where it is.
 */
export function advanceProgress(
  progress: number,
  dt: number,
  speed: number,
  pathLength: number,
): number {
  if (pathLength <= 0 || speed <= 0 || dt <= 0) return normalizeProgress(progress)
  return normalizeProgress(progress + (speed * dt) / pathLength)
}

export function pointAlongPolyline(
  points: readonly Vec3[],
  t: number,
): { point: Vec3; heading: number } {
  const first = points[0]
  if (!first) return { point: { x: 0, y: 0, z: 0 }, heading: 0 }
  const second = points[1]
  if (!second) return { point: { ...first }, heading: 0 }

  const clamped = Math.min(1, Math.max(0, t))
  const total = polylineLength(points)
  if (total === 0) return { point: { ...first }, heading: headingBetween(first, second) }

  let remaining = clamped * total
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    if (!start || !end) continue
    const segment = distance(start, end)
    const last = index === points.length - 1
    if (remaining <= segment || last) {
      const along = segment === 0 ? 0 : Math.min(1, remaining / segment)
      return {
        point: {
          x: start.x + (end.x - start.x) * along,
          y: start.y + (end.y - start.y) * along,
          z: start.z + (end.z - start.z) * along,
        },
        heading: headingBetween(start, end),
      }
    }
    remaining -= segment
  }

  const last = points[points.length - 1] ?? first
  return { point: { ...last }, heading: 0 }
}

/** Step `point` toward `toward` without passing the midpoint of a short gap. */
export function pullToward(point: Vec3, toward: Vec3, gap: number): Vec3 {
  const dx = toward.x - point.x
  const dz = toward.z - point.z
  const length = Math.hypot(dx, dz)
  if (length === 0 || length <= gap) {
    return { x: (point.x + toward.x) / 2, y: 0, z: (point.z + toward.z) / 2 }
  }
  return {
    x: point.x + (dx / length) * gap,
    y: 0,
    z: point.z + (dz / length) * gap,
  }
}

const DEPOT_CLEARANCE = 1.35

/** Axis-aligned road from one depot pad to another, stopping short of each building. */
export function roadRoute(from: Vec3, to: Vec3): Vec3[] {
  const start = { x: from.x, y: 0, z: from.z }
  const end = { x: to.x, y: 0, z: to.z }
  const sameX = Math.abs(start.x - end.x) < 0.001
  const sameZ = Math.abs(start.z - end.z) < 0.001
  if (sameX || sameZ) {
    return [pullToward(start, end, DEPOT_CLEARANCE), pullToward(end, start, DEPOT_CLEARANCE)]
  }
  const corner = { x: end.x, y: 0, z: start.z }
  return [
    pullToward(start, corner, DEPOT_CLEARANCE),
    corner,
    pullToward(end, corner, DEPOT_CLEARANCE),
  ]
}

export type Segment = { a: Vec3; b: Vec3 }

export function routeSegments(points: readonly Vec3[]): Segment[] {
  const segments: Segment[] = []
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    if (!start || !end) continue
    if (distance(start, end) < 0.001) continue
    segments.push({ a: start, b: end })
  }
  return segments
}
