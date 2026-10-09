import { Html } from "@react-three/drei"
import type { Depot } from "../sim/types"

export function DepotMesh({ depot }: { depot: Depot }) {
  return (
    <group position={[depot.position.x, 0, depot.position.z]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.1, 1.35]} />
        <meshStandardMaterial color="#c2ae96" />
      </mesh>
      <mesh position={[0, 1.16, 0]} castShadow>
        <boxGeometry args={[1.96, 0.16, 1.5]} />
        <meshStandardMaterial color="#6e5844" />
      </mesh>
      <mesh position={[0, 0.36, 0.69]}>
        <boxGeometry args={[0.55, 0.68, 0.05]} />
        <meshStandardMaterial color="#2c261f" />
      </mesh>
      <mesh position={[-0.55, 0.7, 0.69]}>
        <boxGeometry args={[0.28, 0.22, 0.05]} />
        <meshStandardMaterial color="#d9e7ef" />
      </mesh>
      <mesh position={[0.55, 0.7, 0.69]}>
        <boxGeometry args={[0.28, 0.22, 0.05]} />
        <meshStandardMaterial color="#d9e7ef" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.62, 8]} />
        <meshStandardMaterial color="#e7d7bc" emissive="#e0b15a" emissiveIntensity={0.35} />
      </mesh>
      <Html
        position={[0, 2.15, 0]}
        center
        distanceFactor={14}
        zIndexRange={[8, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="pointer-events-none rounded-md bg-stone-950/75 px-1.5 py-0.5 text-[10px] font-medium tracking-wide whitespace-nowrap text-stone-100">
          {depot.name}
        </div>
      </Html>
    </group>
  )
}
