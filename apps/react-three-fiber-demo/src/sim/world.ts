import { polylineLength, roadRoute } from "./routes"
import type { Depot, Order } from "./types"

export const ORDER_SPEED = 2.6
export const MAX_ORDERS = 8

export const DEPOTS: readonly Depot[] = [
  { id: "north", name: "North Hub", position: { x: 0, y: 0, z: -8 } },
  { id: "east", name: "East Dock", position: { x: 8, y: 0, z: 2 } },
  { id: "south", name: "South Yard", position: { x: -2, y: 0, z: 8 } },
  { id: "west", name: "West Gate", position: { x: -8, y: 0, z: -2 } },
]

const COLORS = ["#e07a3d", "#3d8b7a", "#d4a017", "#6d8ec9", "#c45c5c", "#8d6bb5"]

export function depotById(id: string): Depot {
  const depot = DEPOTS.find((item) => item.id === id)
  if (!depot) throw new Error(`Unknown depot ${id}`)
  return depot
}

function orderBetween(
  id: string,
  fromId: string,
  toId: string,
  progress: number,
  color: string,
): Order {
  const from = depotById(fromId)
  const to = depotById(toId)
  const route = roadRoute(from.position, to.position)
  if (polylineLength(route) <= 0) throw new Error(`Route ${id} has no length`)
  return { id, fromId, toId, route, progress, color }
}

export function createInitialOrders(): Order[] {
  return [
    orderBetween("ORD-101", "north", "east", 0.12, COLORS[0] ?? "#e07a3d"),
    orderBetween("ORD-102", "west", "south", 0.46, COLORS[1] ?? "#3d8b7a"),
    orderBetween("ORD-103", "east", "south", 0.72, COLORS[2] ?? "#d4a017"),
  ]
}

function nextOrderId(orders: readonly Order[]): string {
  const used = new Set(orders.map((order) => order.id))
  let number = 101
  while (used.has(`ORD-${number}`)) number += 1
  return `ORD-${number}`
}

export function addOrder(orders: readonly Order[]): Order {
  const index = orders.length
  const from = DEPOTS[index % DEPOTS.length]
  const to = DEPOTS[(index + 2) % DEPOTS.length]
  if (!from || !to || from.id === to.id) throw new Error("Need two depots for an order")
  return orderBetween(
    nextOrderId(orders),
    from.id,
    to.id,
    0,
    COLORS[index % COLORS.length] ?? "#e07a3d",
  )
}
