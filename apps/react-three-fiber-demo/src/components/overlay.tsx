import { useEffect, useState } from "react"
import { Pause, Play, Plus } from "lucide-react"
import { polylineLength } from "../sim/routes"
import { DEPOTS, depotById, MAX_ORDERS } from "../sim/world"
import type { Order } from "../sim/types"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

type OverlayProps = {
  orders: readonly Order[]
  playing: boolean
  speed: number
  selectedId: string | null
  progressMap: { current: Record<string, number> }
  onToggle: () => void
  onSpeed: (speed: number) => void
  onAdd: () => void
  onSelect: (id: string) => void
}

export function Overlay({
  orders,
  playing,
  speed,
  selectedId,
  progressMap,
  onToggle,
  onSpeed,
  onAdd,
  onSelect,
}: OverlayProps) {
  const selected = orders.find((order) => order.id === selectedId) ?? null
  const [shown, setShown] = useState(selected?.progress ?? 0)
  const [trackedId, setTrackedId] = useState(selected?.id ?? null)
  if ((selected?.id ?? null) !== trackedId) {
    setTrackedId(selected?.id ?? null)
    setShown(selected ? (progressMap.current[selected.id] ?? selected.progress) : 0)
  }

  useEffect(() => {
    if (!selected) return
    const read = () => {
      setShown(progressMap.current[selected.id] ?? selected.progress)
    }
    read()
    const timer = window.setInterval(read, 100)
    return () => window.clearInterval(timer)
  }, [progressMap, selected])

  const percent = Math.round((shown % 1) * 100)
  const full = orders.length >= MAX_ORDERS

  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-4">
      <Card className="pointer-events-auto max-h-[calc(100%-1.5rem)] w-[min(22rem,100%)] overflow-auto bg-card/95 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Yard dispatch</CardTitle>
            <Badge variant={playing ? "default" : "outline"}>{playing ? "Playing" : "Paused"}</Badge>
          </div>
          <CardDescription>Orders move between depots on the yard map.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onToggle}>
              {playing ? <Pause /> : <Play />}
              {playing ? "Pause" : "Play"}
            </Button>
            <Button type="button" variant="outline" onClick={onAdd} disabled={full}>
              <Plus />
              Add order
            </Button>
          </div>

          <label className="grid gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center justify-between">
              Speed
              <span className="font-medium text-foreground">{speed.toFixed(1)}×</span>
            </span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.5}
              value={speed}
              aria-label="Playback speed"
              onChange={(event) => onSpeed(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </label>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Orders" value={String(orders.length)} />
            <Stat label="Depots" value={String(DEPOTS.length)} />
            <Stat label="Selected" value={selected ? `${percent}%` : "—"} />
          </dl>

          <section className="grid gap-2 rounded-lg bg-muted/70 p-3">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{selected.id}</p>
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: selected.color }}
                    aria-hidden
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {depotById(selected.fromId).name} → {depotById(selected.toId).name}
                </p>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-background"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label={`${selected.id} route progress`}
                >
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {polylineLength(selected.route).toFixed(1)} map units, looping
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Click a truck to inspect its order.</p>
            )}
          </section>

          <ul className="grid gap-1">
            {orders.map((order) => {
              const active = order.id === selectedId
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(order.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                      active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: order.color }}
                        aria-hidden
                      />
                      {order.id}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {depotById(order.fromId).name} → {depotById(order.toId).name}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}
