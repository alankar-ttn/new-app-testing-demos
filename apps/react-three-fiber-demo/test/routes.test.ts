import { expect, test } from "bun:test"
import {
  advanceProgress,
  distance,
  headingBetween,
  pointAlongPolyline,
  polylineLength,
  roadRoute,
} from "../src/sim/routes"
import type { Vec3 } from "../src/sim/types"

const north: Vec3 = { x: 0, y: 0, z: -8 }
const east: Vec3 = { x: 8, y: 0, z: 2 }

test("polyline length sums each segment", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 3, y: 0, z: 0 },
    { x: 3, y: 0, z: 4 },
  ]
  expect(polylineLength(points)).toBeCloseTo(7)
  expect(polylineLength([])).toBe(0)
  expect(polylineLength([points[0]!])).toBe(0)
})

test("point along a polyline hits the ends and the midpoint", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 10 },
  ]
  const start = pointAlongPolyline(points, 0)
  const middle = pointAlongPolyline(points, 0.5)
  const end = pointAlongPolyline(points, 1)
  expect(start.point).toEqual({ x: 0, y: 0, z: 0 })
  expect(middle.point.z).toBeCloseTo(5)
  expect(end.point).toEqual({ x: 0, y: 0, z: 10 })
  expect(start.heading).toBeCloseTo(0)
  expect(headingBetween(points[0]!, { x: 10, y: 0, z: 0 })).toBeCloseTo(Math.PI / 2)
})

test("progress advances in world units and loops", () => {
  expect(advanceProgress(0, 1, 5, 10)).toBeCloseTo(0.5)
  expect(advanceProgress(0.9, 1, 5, 10)).toBeCloseTo(0.4)
  expect(advanceProgress(0.2, 0, 5, 10)).toBeCloseTo(0.2)
  expect(advanceProgress(0.2, 1, 0, 10)).toBeCloseTo(0.2)
  expect(advanceProgress(0.2, 1, 5, 0)).toBeCloseTo(0.2)
  expect(advanceProgress(1, 0, 1, 10)).toBeCloseTo(0)
})

test("roads bend on one axis and stop short of each depot", () => {
  const route = roadRoute(north, east)
  const expected = [
    { x: 1.35, z: -8 },
    { x: 8, z: -8 },
    { x: 8, z: 0.65 },
  ]
  expect(route).toHaveLength(expected.length)
  route.forEach((point, index) => {
    expect(point.x).toBeCloseTo(expected[index]!.x)
    expect(point.y).toBe(0)
    expect(point.z).toBeCloseTo(expected[index]!.z)
  })
  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1]!
    const end = route[index]!
    const movesX = Math.abs(start.x - end.x) > 0.001
    const movesZ = Math.abs(start.z - end.z) > 0.001
    expect(movesX && movesZ).toBe(false)
  }
  expect(distance(route[0]!, north)).toBeCloseTo(1.35)
  expect(distance(route[route.length - 1]!, east)).toBeCloseTo(1.35)
  expect(polylineLength(route)).toBeCloseTo(15.3)
})
