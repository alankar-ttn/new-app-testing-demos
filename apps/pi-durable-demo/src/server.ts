import { spawn, type ChildProcess } from "node:child_process"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { existsSync, rmSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer as createViteServer, type ViteDevServer } from "vite"
import { readSnapshotFile } from "./snapshot-file"
import type { PublicState, RunPhase, WorkerSnapshot } from "./types"

const appRoot = fileURLToPath(new URL("..", import.meta.url))
const dataDir = join(appRoot, "data")
const port = Number(process.env.PORT ?? 3000)

let phase: RunPhase = "idle"
let error: string | null = null
let snapshot: WorkerSnapshot | null = null
let child: ChildProcess | null = null
let killRequested = false
let stderrTail = ""
const listeners = new Set<ServerResponse>()

function publicState(): PublicState {
  return { phase, error, snapshot }
}

function broadcast(): void {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`
  for (const listener of listeners) listener.write(payload)
}

function setSnapshot(next: WorkerSnapshot): void {
  snapshot = next
  broadcast()
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf8")
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  })
  res.end(payload)
}

function spawnWorker(mode: "start" | "resume"): void {
  killRequested = false
  stderrTail = ""
  phase = "running"
  error = null
  const worker = spawn(
    process.execPath,
    [join(appRoot, "src/worker.ts"), "--data", dataDir, "--mode", mode],
    { cwd: appRoot, stdio: ["ignore", "pipe", "pipe"] },
  )
  child = worker
  let buffer = ""
  worker.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString()
    let newline = buffer.indexOf("\n")
    while (newline >= 0) {
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as { type?: string; snapshot?: WorkerSnapshot }
          if (message.type === "snapshot" && message.snapshot) setSnapshot(message.snapshot)
        } catch {
          stderrTail = `${stderrTail}${line}\n`.slice(-2000)
        }
      }
      newline = buffer.indexOf("\n")
    }
  })
  worker.stderr?.on("data", (chunk: Buffer) => {
    stderrTail = `${stderrTail}${chunk.toString()}`.slice(-2000)
  })
  worker.on("exit", (code, signal) => {
    if (child === worker) child = null
    const disk = readSnapshotFile(dataDir)
    if (disk) snapshot = disk
    if (killRequested || signal === "SIGKILL") {
      phase = "killed"
      error = null
    } else if (code === 0) {
      phase = "done"
      error = null
    } else {
      phase = "error"
      error = stderrTail.trim() || `Worker exited with code ${code ?? "unknown"}`
    }
    killRequested = false
    broadcast()
  })
  broadcast()
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, publicState())
    return
  }

  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    })
    res.write(`data: ${JSON.stringify(publicState())}\n\n`)
    listeners.add(res)
    req.on("close", () => listeners.delete(res))
    return
  }

  if (req.method === "POST" && url.pathname === "/api/start") {
    if (child) {
      sendJson(res, 409, { error: "A worker is already running." })
      return
    }
    const body = JSON.parse(await readBody(req)) as { changelog?: unknown }
    const changelog = typeof body.changelog === "string" ? body.changelog.trim() : ""
    if (!changelog || changelog.length > 20_000) {
      sendJson(res, 400, { error: "Paste a changelog first." })
      return
    }
    rmSync(dataDir, { recursive: true, force: true })
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, "changelog.txt"), `${changelog}\n`)
    snapshot = null
    spawnWorker("start")
    sendJson(res, 200, publicState())
    return
  }

  if (req.method === "POST" && url.pathname === "/api/kill") {
    if (!child) {
      sendJson(res, 409, { error: "No worker is running." })
      return
    }
    killRequested = true
    child.kill("SIGKILL")
    sendJson(res, 200, publicState())
    return
  }

  if (req.method === "POST" && url.pathname === "/api/resume") {
    if (child) {
      sendJson(res, 409, { error: "A worker is already running." })
      return
    }
    if (!existsSync(join(dataDir, "session.sqlite"))) {
      sendJson(res, 409, { error: "No checkpoint file to resume." })
      return
    }
    spawnWorker("resume")
    sendJson(res, 200, publicState())
    return
  }

  sendJson(res, 404, { error: "Not found" })
}

const vite: ViteDevServer = await createViteServer({
  root: appRoot,
  server: { middlewareMode: true },
  appType: "spa",
})

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
  if (url.pathname.startsWith("/api")) {
    handleApi(req, res, url).catch((caught: unknown) => {
      const message = caught instanceof Error ? caught.message : "Request failed"
      if (!res.headersSent) sendJson(res, 500, { error: message })
      else res.end()
    })
    return
  }
  vite.middlewares(req, res, () => {
    res.statusCode = 404
    res.end("Not found")
  })
})

server.listen(port, "0.0.0.0", () => {
  console.log(`Pi Durable demo at http://127.0.0.1:${port}`)
})
