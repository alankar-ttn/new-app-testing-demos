export type Vec3 = {
  x: number
  y: number
  z: number
}

export type Depot = {
  id: string
  name: string
  position: Vec3
}

export type Order = {
  id: string
  fromId: string
  toId: string
  route: Vec3[]
  progress: number
  color: string
}
