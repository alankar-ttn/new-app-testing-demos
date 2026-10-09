import { Component, useCallback, useRef, useState, type ReactNode } from "react"
import { addOrder, createInitialOrders, MAX_ORDERS } from "../sim/world"
import type { Order } from "../sim/types"
import { Overlay } from "./overlay"
import { Scene } from "./scene"

export function DemoApp() {
  const [orders, setOrders] = useState<Order[]>(createInitialOrders)
  const [playing, setPlaying] = useState(prefersMotion)
  const [speed, setSpeed] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const progressMap = useRef<Record<string, number>>({})

  const onAdd = useCallback(() => {
    setOrders((current) => {
      if (current.length >= MAX_ORDERS) return current
      return [...current, addOrder(current)]
    })
  }, [])

  return (
    <div className="relative h-full w-full bg-[#1a1612] text-foreground">
      <SceneBoundary>
        <Scene
          orders={orders}
          playing={playing}
          speed={speed}
          selectedId={selectedId}
          onSelect={setSelectedId}
          progressMap={progressMap}
        />
      </SceneBoundary>
      <Overlay
        orders={orders}
        playing={playing}
        speed={speed}
        selectedId={selectedId}
        progressMap={progressMap}
        onToggle={() => setPlaying((value) => !value)}
        onSpeed={setSpeed}
        onAdd={onAdd}
        onSelect={setSelectedId}
      />
    </div>
  )
}

function prefersMotion(): boolean {
  if (typeof window === "undefined") return true
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

type BoundaryProps = { children: ReactNode }
type BoundaryState = { failed: boolean }

class SceneBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-stone-200">
          WebGL did not start, so the yard map cannot be drawn in this browser.
        </div>
      )
    }
    return this.props.children
  }
}
