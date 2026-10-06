import { countEffects, type EffectEvent } from "./effects"
import { messageText, toolCallNames } from "./mock-model"
import type { Checkpoint, ToolCard, ToolStatus, WorkerSnapshot } from "./types"

export const SCAN_TOOL = "scan_changelog"
export const STAMP_TOOL = "stamp_release"

type LooseMessage = {
  role?: string
  content?: unknown
  toolName?: string
  isError?: boolean
  stopReason?: string
}

type LooseEntry = {
  id: string
  kind: string
  model?: readonly LooseMessage[]
}

type LiveTool = {
  callId?: string
  name?: string
  status?: string
  output?: string
}

export type ProjectView = {
  entries: readonly LooseEntry[]
  docs: Readonly<Record<string, unknown>>
}

const BLURBS: Record<string, { replay: "safe" | "unsafe"; blurb: string }> = {
  [SCAN_TOOL]: {
    replay: "safe",
    blurb: "Reads the pasted changelog. An in-flight call runs again after a crash. A finished call stays finished.",
  },
  [STAMP_TOOL]: {
    replay: "unsafe",
    blurb: "Records a publish, then keeps working. An in-flight call is reported as interrupted and is not run again.",
  },
}

function liveTools(view: ProjectView): LiveTool[] {
  const live = view.docs["pi.live"]
  if (!live || typeof live !== "object") return []
  const tools = (live as { tools?: unknown }).tools
  if (!Array.isArray(tools)) return []
  return tools.filter((tool): tool is LiveTool => !!tool && typeof tool === "object")
}

function generationLive(view: ProjectView): boolean {
  const live = view.docs["pi.live"]
  if (!live || typeof live !== "object") return false
  return (live as { generation?: unknown }).generation !== undefined
}

function resultFor(entries: readonly LooseEntry[], name: string): LooseMessage | undefined {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry?.kind !== "pi.tool-result") continue
    const message = entry.model?.[0]
    if (message?.toolName === name) return message
  }
  return undefined
}

function toolCard(
  name: string,
  effects: readonly EffectEvent[],
  entries: readonly LooseEntry[],
  live: readonly LiveTool[],
): ToolCard {
  const meta = BLURBS[name] ?? {
    replay: "unsafe" as const,
    blurb: "",
  }
  const executions = countEffects(
    effects,
    name as "scan_changelog" | "stamp_release",
    "execute",
  )
  const sideEffects = countEffects(
    effects,
    name as "scan_changelog" | "stamp_release",
    "publish",
  )
  const slot = live.find((tool) => tool.name === name && tool.status !== "done")
  const result = resultFor(entries, name)
  const output = slot?.output?.trim() || (result ? messageText(result.content) : "")
  let status: ToolStatus = "idle"
  if (slot && (slot.status === "running" || slot.status === "pending")) {
    status = executions > 1 ? "replaying" : "running"
  } else if (result?.isError) {
    status = "interrupted"
  } else if (result && executions > 1) {
    status = "replayed"
  } else if (result) {
    status = "completed"
  } else if (executions > 0) {
    status = executions > 1 ? "replaying" : "running"
  }
  return {
    name,
    replay: meta.replay,
    blurb: meta.blurb,
    status,
    executions,
    sideEffects,
    output,
  }
}

function checkpointsFor(view: ProjectView): Checkpoint[] {
  const committed: Checkpoint[] = []
  for (const entry of view.entries) {
    const message = entry.model?.[0]
    if (entry.kind === "pi.user") {
      committed.push({
        id: entry.id,
        title: "Checkpoint: input admitted",
        detail: clip(messageText(message?.content)),
        state: "committed",
      })
      continue
    }
    if (entry.kind === "pi.assistant") {
      const names = toolCallNames(message?.content)
      if (message?.stopReason === "aborted") {
        committed.push({
          id: entry.id,
          title: "Checkpoint: model response aborted",
          detail: "Partial answer kept. The request is sent again on resume.",
          state: "committed",
        })
      } else if (names.length > 0) {
        committed.push({
          id: entry.id,
          title: "Checkpoint: model requested tools",
          detail: names.join(" + "),
          state: "committed",
        })
      } else {
        committed.push({
          id: entry.id,
          title: "Checkpoint: release brief stored",
          detail: clip(messageText(message?.content)),
          state: "committed",
        })
      }
      continue
    }
    if (entry.kind === "pi.tool-result") {
      const name = message?.toolName ?? "tool"
      const interrupted = message?.isError === true
      committed.push({
        id: entry.id,
        title: interrupted
          ? `Checkpoint: ${name} interrupted`
          : `Checkpoint: ${name} result stored`,
        detail: interrupted
          ? "Not replayed. The model receives this interruption."
          : clip(messageText(message?.content)),
        state: "committed",
      })
    }
  }

  const live: Checkpoint[] = []
  if (generationLive(view)) {
    live.push({
      id: "live-generation",
      title: "Model request in flight",
      detail: "Committed again if the process dies mid-stream.",
      state: "live",
    })
  }
  for (const tool of liveTools(view)) {
    if (tool.status === "done" || !tool.name) continue
    live.push({
      id: `live-${tool.callId ?? tool.name}`,
      title: `${tool.name} ${tool.status === "pending" ? "queued" : "running"}`,
      detail: clip(tool.output ?? "") || "Waiting for the next output checkpoint.",
      state: "live",
    })
  }
  return [...committed, ...live]
}

function clip(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim()
  if (oneLine.length <= 180) return oneLine
  return `${oneLine.slice(0, 177)}...`
}

function hintFor(tools: readonly ToolCard[], settled: boolean): string {
  const scan = tools.find((tool) => tool.name === SCAN_TOOL)
  const stamp = tools.find((tool) => tool.name === STAMP_TOOL)
  if (!scan || !stamp) return ""
  if (scan.status === "running" && (stamp.status === "running" || stamp.status === "replaying")) {
    return "Both tools are in flight. Kill the agent to crash the worker on this checkpoint."
  }
  if (scan.status === "replaying" && stamp.status === "interrupted") {
    return "Resumed from the last checkpoint. scan_changelog is running again. stamp_release was not."
  }
  if (settled && stamp.status === "interrupted" && scan.executions > 1) {
    return "Resume finished. The safe scan ran again. The publish was not repeated."
  }
  if (settled && stamp.status === "interrupted") {
    return "Resume finished. The completed scan was not repeated. The publish was not run again."
  }
  if (settled) return "Run finished. Both tools completed without a crash."
  return "Checkpoints appear as the harness commits each step."
}

export function briefFromEntries(entries: readonly LooseEntry[]): string {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry?.kind !== "pi.assistant") continue
    const message = entry.model?.[0]
    if (message?.stopReason === "toolUse" || message?.stopReason === "aborted") continue
    const text = messageText(message?.content)
    if (text) return text
  }
  return ""
}

export function projectSnapshot(
  view: ProjectView,
  effects: readonly EffectEvent[],
  settled: boolean,
): WorkerSnapshot {
  const tools = [toolCard(SCAN_TOOL, effects, view.entries, liveTools(view)), toolCard(STAMP_TOOL, effects, view.entries, liveTools(view))]
  return {
    checkpoints: checkpointsFor(view),
    tools,
    brief: briefFromEntries(view.entries),
    hint: hintFor(tools, settled),
    settled,
  }
}
