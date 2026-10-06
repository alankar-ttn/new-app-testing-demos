import { describe, expect, test } from "bun:test"
import { spawn, type ChildProcess } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { readEffects } from "../src/effects"
import { readSnapshotFile } from "../src/snapshot-file"
import type { WorkerSnapshot } from "../src/types"

const appRoot = fileURLToPath(new URL("..", import.meta.url))

function spawnWorker(dataDir: string, mode: "start" | "resume"): ChildProcess {
  return spawn(process.execPath, ["src/worker.ts", "--data", dataDir, "--mode", mode], {
    cwd: appRoot,
    env: {
      ...process.env,
      PI_DEMO_SCAN_MS: "2500",
      PI_DEMO_STAMP_MS: "2500",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
}

function watch(child: ChildProcess, onSnapshot: (snapshot: WorkerSnapshot) => void): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    let buffer = ""
    let stderr = ""
    child.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString()
      let newline = buffer.indexOf("\n")
      while (newline >= 0) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        if (line.trim()) {
          const message = JSON.parse(line) as { type?: string; snapshot?: WorkerSnapshot }
          if (message.type === "snapshot" && message.snapshot) onSnapshot(message.snapshot)
        }
        newline = buffer.indexOf("\n")
      }
    })
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("exit", (code) => resolve({ code, stderr }))
  })
}

describe("pi-durable kill and resume", () => {
  test("replays the safe scan and does not rerun the publish", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "pi-durable-"))
    try {
      await writeFile(
        join(dataDir, "changelog.txt"),
        "## 2.4.0\n\n- Checkpointed tool calls\n- Replay-safe reads\n",
      )
      const first = spawnWorker(dataDir, "start")
      let killed = false
      const firstExit = watch(first, (snapshot) => {
        const scan = snapshot.tools.find((tool) => tool.name === "scan_changelog")
        const stamp = snapshot.tools.find((tool) => tool.name === "stamp_release")
        if (!killed && scan && stamp && scan.executions >= 1 && stamp.executions >= 1 && stamp.sideEffects >= 1) {
          killed = true
          first.kill("SIGKILL")
        }
      })
      const firstResult = await firstExit
      expect(killed).toBe(true)
      expect(firstResult.code).not.toBe(0)

      const second = spawnWorker(dataDir, "resume")
      const secondResult = await watch(second, () => {})
      expect(secondResult.code, secondResult.stderr).toBe(0)

      const snapshot = readSnapshotFile(dataDir)
      const effects = readEffects(dataDir)
      const scanRuns = effects.filter((event) => event.tool === "scan_changelog" && event.event === "execute")
      const stampRuns = effects.filter((event) => event.tool === "stamp_release" && event.event === "execute")
      const publishes = effects.filter((event) => event.tool === "stamp_release" && event.event === "publish")
      expect(scanRuns).toHaveLength(2)
      expect(stampRuns).toHaveLength(1)
      expect(publishes).toHaveLength(1)
      expect(snapshot?.tools.find((tool) => tool.name === "stamp_release")?.status).toBe("interrupted")
      expect(snapshot?.brief).toContain("was not run again")
      expect(snapshot?.settled).toBe(true)
    } finally {
      await rm(dataDir, { recursive: true, force: true })
    }
  }, 40_000)
})
