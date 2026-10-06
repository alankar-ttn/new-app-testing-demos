import { closeSync, fsyncSync, openSync, readFileSync, writeSync } from "node:fs"
import { join } from "node:path"

export type EffectTool = "scan_changelog" | "stamp_release"
export type EffectName = "execute" | "publish" | "finish"

export type EffectEvent = {
  tool: EffectTool
  event: EffectName
  at: string
}

export function effectsPath(dataDir: string): string {
  return join(dataDir, "effects.jsonl")
}

export function readEffects(dataDir: string): EffectEvent[] {
  let text = ""
  try {
    text = readFileSync(effectsPath(dataDir), "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as EffectEvent)
}

export function appendEffect(
  dataDir: string,
  event: { tool: EffectTool; event: EffectName },
): void {
  const line = `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`
  const fd = openSync(effectsPath(dataDir), "a")
  try {
    writeSync(fd, line)
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

export function countEffects(
  events: readonly EffectEvent[],
  tool: EffectTool,
  event: EffectName,
): number {
  return events.filter((item) => item.tool === tool && item.event === event).length
}
