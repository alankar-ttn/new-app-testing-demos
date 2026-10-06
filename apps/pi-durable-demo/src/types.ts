export type RunPhase = "idle" | "running" | "killed" | "done" | "error"

export type ToolStatus =
  | "idle"
  | "running"
  | "replaying"
  | "completed"
  | "replayed"
  | "interrupted"

export type ToolCard = {
  name: string
  replay: "safe" | "unsafe"
  blurb: string
  status: ToolStatus
  executions: number
  sideEffects: number
  output: string
}

export type CheckpointState = "committed" | "live"

export type Checkpoint = {
  id: string
  title: string
  detail: string
  state: CheckpointState
}

export type WorkerSnapshot = {
  checkpoints: Checkpoint[]
  tools: ToolCard[]
  brief: string
  hint: string
  settled: boolean
}

export type PublicState = {
  phase: RunPhase
  error: string | null
  snapshot: WorkerSnapshot | null
}
