import { expect, test } from "bun:test"
import { polylineLength } from "../src/sim/routes"
import { addOrder, createInitialOrders, DEPOTS, depotById } from "../src/sim/world"

test("the yard starts with three orders on real routes", () => {
  const orders = createInitialOrders()
  expect(orders.map((order) => order.id)).toEqual(["ORD-101", "ORD-102", "ORD-103"])
  expect(new Set(orders.map((order) => order.id)).size).toBe(orders.length)
  for (const order of orders) {
    expect(order.fromId).not.toBe(order.toId)
    expect(depotById(order.fromId).id).toBe(order.fromId)
    expect(depotById(order.toId).id).toBe(order.toId)
    expect(order.progress).toBeGreaterThanOrEqual(0)
    expect(order.progress).toBeLessThan(1)
    expect(polylineLength(order.route)).toBeGreaterThan(1)
  }
  expect(DEPOTS).toHaveLength(4)
})

test("added orders keep new ids and distinct depots", () => {
  let orders = createInitialOrders()
  for (let count = 0; count < 5; count += 1) {
    const next = addOrder(orders)
    expect(next.fromId).not.toBe(next.toId)
    expect(orders.some((order) => order.id === next.id)).toBe(false)
    expect(polylineLength(next.route)).toBeGreaterThan(1)
    expect(next.progress).toBe(0)
    orders = [...orders, next]
  }
  expect(orders[3]?.id).toBe("ORD-104")
})
