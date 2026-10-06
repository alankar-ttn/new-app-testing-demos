import { spawn, type ChildProcess } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { hubPort, piPort, tanstackPort } from "./ports"

const bun = process.execPath
const hubRoot = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url))
const children: ChildProcess[] = []
let stopping = false

function shutdown(code = 0): void {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM")
  }
  process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

function run(args: string[], cwd: string, env: Record<string, string>): void {
  const child = spawn(args[0] ?? "bun", args.slice(1), {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  })
  children.push(child)
  child.on("exit", (code, signal) => {
    if (stopping || signal === "SIGTERM") return
    if (code && code !== 0) {
      console.error(`${args.join(" ")} exited with code ${code}`)
      shutdown(code)
    }
  })
}

async function ensureInstall(dir: string): Promise<void> {
  if (existsSync(join(dir, "node_modules"))) return
  console.log(`Installing dependencies in ${dir}`)
  const child = spawn(bun, ["install"], { cwd: dir, stdio: "inherit" })
  const code = await new Promise<number>((resolve) => {
    child.on("exit", (exitCode) => resolve(exitCode ?? 1))
  })
  if (code !== 0) throw new Error(`bun install failed in ${dir}`)
}

const tanstackDir = join(repoRoot, "apps/tanstack-start-demo")
const piDir = join(repoRoot, "apps/pi-durable-demo")
const hubOrigin = `http://127.0.0.1:${hubPort}`

await ensureInstall(hubRoot)
await ensureInstall(tanstackDir)
await ensureInstall(piDir)

run(
  [bun, "--bun", "vite", "dev", "--port", String(tanstackPort), "--strictPort", "--host", "127.0.0.1"],
  tanstackDir,
  {
    DEMO_BASE_PATH: "/demos/tanstack-start-demo",
    DEMO_HUB_ORIGIN: hubOrigin,
  },
)

run([bun, "src/server.ts"], piDir, {
  PORT: String(piPort),
  DEMO_BASE_PATH: "/demos/pi-durable-demo",
  DEMO_HUB_ORIGIN: hubOrigin,
})

run(
  [bun, "--bun", "vite", "dev", "--port", String(hubPort), "--strictPort", "--host", "127.0.0.1"],
  hubRoot,
  {},
)

console.log(`Demo hub at ${hubOrigin}`)
