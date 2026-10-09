import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group } from "three"
import { advanceProgress, pointAlongPolyline, polylineLength } from "../sim/routes"
import { ORDER_SPEED } from "../sim/world"
import type { Order } from "../sim/types"
import { useDragSafeClick } from "./use-drag-safe-click"

type VehicleProps = {
  order: Order
  playing: boolean
  speed: number
  selected: boolean
  onSelect: (id: string) => void
  progressMap: { current: Record<string, number> }
}

export function Vehicle({ order, playing, speed, selected, onSelect, progressMap }: VehicleProps) {
  const group = useRef<Group>(null)
  const progress = useRef(order.progress)
  const length = useMemo(() => polylineLength(order.route), [order.route])
  const select = useDragSafeClick(() => onSelect(order.id))

  useFrame((_, dt) => {
    progress.current = advanceProgress(
      progress.current,
      playing ? dt : 0,
      ORDER_SPEED * speed,
      length,
    )
    progressMap.current[order.id] = progress.current
    const pose = pointAlongPolyline(order.route, progress.current)
    if (!group.current) return
    group.current.position.set(pose.point.x, 0, pose.point.z)
    group.current.rotation.y = pose.heading
  })

  return (
    <group ref={group}>
      <Truck color={order.color} selected={selected} />
      <mesh position={[0, 0.45, 0.05]} {...select}>
        <boxGeometry args={[1.15, 0.9, 1.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Truck({ color, selected }: { color: string; selected: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.42, -0.18]} castShadow>
        <boxGeometry args={[0.72, 0.42, 1.05]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.55 : 0}
        />
      </mesh>
      <mesh position={[0, 0.64, -0.18]} castShadow>
        <boxGeometry args={[0.48, 0.16, 0.62]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
      <mesh position={[0, 0.36, 0.58]} castShadow>
        <boxGeometry args={[0.68, 0.36, 0.48]} />
        <meshStandardMaterial color="#f7f1e8" />
      </mesh>
      <mesh position={[0, 0.46, 0.78]}>
        <boxGeometry args={[0.46, 0.16, 0.06]} />
        <meshStandardMaterial color="#9ec9df" />
      </mesh>
      <Wheel position={[-0.32, 0.14, 0.48]} />
      <Wheel position={[0.32, 0.14, 0.48]} />
      <Wheel position={[-0.32, 0.14, -0.42]} />
      <Wheel position={[0.32, 0.14, -0.42]} />
      {selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.1]}>
          <ringGeometry args={[0.72, 0.88, 28]} />
          <meshBasicMaterial color="#f6d56a" />
        </mesh>
      ) : null}
    </group>
  )
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
      <meshStandardMaterial color="#1c1814" />
    </mesh>
  )
}
