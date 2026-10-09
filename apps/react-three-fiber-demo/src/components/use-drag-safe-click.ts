import { useCallback, useRef } from "react"
import type { ThreeEvent } from "@react-three/fiber"

const DRAG_SLOP_PX = 4

/** Ignore clicks that are really an orbit drag. */
export function useDragSafeClick(onClick: () => void) {
  const origin = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    origin.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
  }, [])

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const start = origin.current
      if (!start) return
      const dx = event.nativeEvent.clientX - start.x
      const dy = event.nativeEvent.clientY - start.y
      if (dx * dx + dy * dy > DRAG_SLOP_PX * DRAG_SLOP_PX) return
      onClick()
    },
    [onClick],
  )

  return { onPointerDown, onClick: handleClick }
}
