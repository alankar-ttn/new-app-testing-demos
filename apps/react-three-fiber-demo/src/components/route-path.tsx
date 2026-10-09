import { distance, headingBetween, routeSegments } from "../sim/routes"
import type { Vec3 } from "../sim/types"

type RoutePathProps = {
  points: readonly Vec3[]
  color: string
  y: number
  selected: boolean
}

export function RoutePath({ points, color, y, selected }: RoutePathProps) {
  const segments = routeSegments(points)
  return (
    <group>
      {segments.map((segment, index) => {
        const length = distance(segment.a, segment.b)
        const heading = headingBetween(segment.a, segment.b)
        return (
          <mesh
            key={`${segment.a.x}:${segment.a.z}:${index}`}
            position={[(segment.a.x + segment.b.x) / 2, y, (segment.a.z + segment.b.z) / 2]}
            rotation={[0, heading, 0]}
            receiveShadow
          >
            <boxGeometry args={[selected ? 0.28 : 0.16, 0.035, length]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={selected ? 0.4 : 0.12}
            />
          </mesh>
        )
      })}
    </group>
  )
}
