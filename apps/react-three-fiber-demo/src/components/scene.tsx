import { useCallback } from "react"
import { Grid, OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { DEPOTS } from "../sim/world"
import type { Order } from "../sim/types"
import { DepotMesh } from "./depot"
import { RoutePath } from "./route-path"
import { useDragSafeClick } from "./use-drag-safe-click"
import { Vehicle } from "./vehicle"

type SceneProps = {
  orders: readonly Order[]
  playing: boolean
  speed: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  progressMap: { current: Record<string, number> }
}

export function Scene(props: SceneProps) {
  return (
    <Canvas
      className="h-full w-full"
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [16, 13, 18], fov: 40, near: 0.1, far: 120 }}
    >
      <color attach="background" args={["#1a1612"]} />
      <fog attach="fog" args={["#1a1612", 24, 52]} />
      <Yard {...props} />
    </Canvas>
  )
}

function Yard({ orders, playing, speed, selectedId, onSelect, progressMap }: SceneProps) {
  const clear = useCallback(() => onSelect(null), [onSelect])
  const groundClick = useDragSafeClick(clear)

  return (
    <>
      <hemisphereLight args={["#f4ead8", "#2a241c", 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        castShadow
        position={[12, 18, 8]}
        intensity={1.7}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={48}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow {...groundClick}>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color="#241f1a" />
      </mesh>
      <Grid
        args={[32, 32]}
        position={[0, 0.02, 0]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#4a4036"
        sectionSize={5}
        sectionThickness={1.15}
        sectionColor="#8d7862"
        fadeDistance={30}
        fadeStrength={1.4}
        followCamera={false}
        infiniteGrid={false}
      />
      {orders.map((order, index) => (
        <RoutePath
          key={order.id}
          points={order.route}
          color={order.color}
          y={0.04 + index * 0.01}
          selected={order.id === selectedId}
        />
      ))}
      {DEPOTS.map((depot) => (
        <DepotMesh key={depot.id} depot={depot} />
      ))}
      {orders.map((order) => (
        <Vehicle
          key={order.id}
          order={order}
          playing={playing}
          speed={speed}
          selected={order.id === selectedId}
          onSelect={onSelect}
          progressMap={progressMap}
        />
      ))}
      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2.08}
        minPolarAngle={0.25}
        minDistance={8}
        maxDistance={36}
        target={[0, 0, 0]}
      />
    </>
  )
}
