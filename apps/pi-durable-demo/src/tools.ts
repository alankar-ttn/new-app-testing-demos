import { Type } from "@earendil-works/pi-ai"
import { defineExtension, defineTool } from "@earendil-works/pi-durable"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseChangelog } from "./brief"
import { appendEffect } from "./effects"

function duration(name: "PI_DEMO_SCAN_MS" | "PI_DEMO_STAMP_MS", fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

async function pace(
  output: (chunk: string) => void,
  label: string,
  ms: number,
): Promise<void> {
  const slices = 8
  const step = Math.max(1, Math.round(ms / slices))
  for (let index = 1; index <= slices; index += 1) {
    output(`${label} ${index}/${slices}\n`)
    await new Promise((resolve) => setTimeout(resolve, step))
  }
}

export function createReleaseExtension(dataDir: string, onEffect: () => void) {
  const changelogPath = join(dataDir, "changelog.txt")

  const scanChangelog = defineTool({
    name: "scan_changelog",
    description: "Read the pasted changelog and return its version and highlights. Safe to run again.",
    parameters: Type.Object({
      source: Type.String({ description: "Use pasted." }),
    }),
    replay: "safe",
    execute: async (_args, api) => {
      appendEffect(dataDir, { tool: "scan_changelog", event: "execute" })
      onEffect()
      await pace(api.output.bind(api), "Scanning changelog", duration("PI_DEMO_SCAN_MS", 10_000))
      const text = readFileSync(changelogPath, "utf8")
      const scan = parseChangelog(text)
      appendEffect(dataDir, { tool: "scan_changelog", event: "finish" })
      onEffect()
      return { content: [{ type: "text", text: JSON.stringify(scan) }] }
    },
  })

  const stampRelease = defineTool({
    name: "stamp_release",
    description: "Publish one release note. Not safe to run again after a crash.",
    parameters: Type.Object({
      version: Type.String({ description: "Version hint. The changelog file is authoritative." }),
    }),
    execute: async (_args, api) => {
      const text = readFileSync(changelogPath, "utf8")
      const scan = parseChangelog(text)
      appendEffect(dataDir, { tool: "stamp_release", event: "publish" })
      appendEffect(dataDir, { tool: "stamp_release", event: "execute" })
      onEffect()
      await pace(api.output.bind(api), `Publishing ${scan.version}`, duration("PI_DEMO_STAMP_MS", 10_000))
      appendEffect(dataDir, { tool: "stamp_release", event: "finish" })
      onEffect()
      return {
        content: [{ type: "text", text: `Stamped release note for ${scan.version}.` }],
      }
    },
  })

  return defineExtension({
    name: "release",
    tools: [scanChangelog, stampRelease],
    sections: [],
  })
}
