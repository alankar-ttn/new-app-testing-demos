import { spawn, type ChildProcess } from "node:child_process"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { existsSync, rmSync, statSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runHarness } from "./harness-run"
import { mountPrefix, stripMount } from "./mount"
import { readSnapshotFile } from "./snapshot-file"
import type { PublicState, RunPhase, WorkerSnapshot } from "./types"

// Static import so the Vercel file trace keeps the worker's packages.
void runHarness

const appRoot = fileURLToPath(new URL("..", import.meta.url))
const dataDir = process.env.VERCEL === "1" ? "/tmp/pi-durable-demo" : join(appRoot, "data")
const port = Number(process.env.PORT ?? 3000)
const hosted = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"

let phase: RunPhase = "idle"
let error: string | null = null
let snapshot: WorkerSnapshot | null = null
let child: ChildProcess | null = null
let killRequested = false
let stderrTail = ""
const listeners = new Set<(payload: string) => void>()

function publicState(): PublicState {
  return { phase, error, snapshot }
}

function broadcast(): void {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch {
      listeners.delete(listener)
    }
  }
}

function setSnapshot(next: WorkerSnapshot): void {
  snapshot = next
  broadcast()
}

function projectRoot(): string {
  const candidates = [appRoot, process.cwd()]
  return candidates.find((dir) => existsSync(join(dir, "node_modules"))) ?? appRoot
}

function workerScript(): string {
  const root = projectRoot()
  const candidates = [join(root, "src/worker.ts"), join(appRoot, "src/worker.ts"), join(process.cwd(), "src/worker.ts")]
  const found = candidates.find((path) => existsSync(path))
  if (!found) throw new Error(`Worker script not found. Looked in ${candidates.join(", ")}`)
  return found
}

function holdUntilExit(exited: Promise<void>): void {
  if (process.env.VERCEL !== "1") return
  void import("@vercel/functions")
    .then(({ waitUntil }) => waitUntil(exited))
    .catch(() => {
      // Local and misconfigured builds still finish the HTTP response.
    })
}

function spawnWorker(mode: "start" | "resume"): void {
  killRequested = false
  stderrTail = ""
  phase = "running"
  error = null
  const root = projectRoot()
  const worker = spawn(
    process.execPath,
    [workerScript(), "--data", dataDir, "--mode", mode],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  )
  child = worker
  let buffer = ""
  const exited = new Promise<void>((resolveExit) => {
    worker.on("exit", () => resolveExit())
  })
  holdUntilExit(exited)
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

type ApiResult = { status: number; body: unknown }

async function startRun(changelog: string): Promise<ApiResult> {
  if (child) return { status: 409, body: { error: "A worker is already running." } }
  if (!changelog || changelog.length > 20_000) {
    return { status: 400, body: { error: "Paste a changelog first." } }
  }
  rmSync(dataDir, { recursive: true, force: true })
  await mkdir(dataDir, { recursive: true })
  await writeFile(join(dataDir, "changelog.txt"), `${changelog}\n`)
  snapshot = null
  spawnWorker("start")
  return { status: 200, body: publicState() }
}

function killRun(): ApiResult {
  if (!child) return { status: 409, body: { error: "No worker is running." } }
  killRequested = true
  child.kill("SIGKILL")
  return { status: 200, body: publicState() }
}

function resumeRun(): ApiResult {
  if (child) return { status: 409, body: { error: "A worker is already running." } }
  if (!existsSync(join(dataDir, "session.sqlite"))) {
    return { status: 409, body: { error: "No checkpoint file to resume." } }
  }
  spawnWorker("resume")
  return { status: 200, body: publicState() }
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

function subscribe(listener: (payload: string) => void): () => void {
  listeners.add(listener)
  listener(`data: ${JSON.stringify(publicState())}\n\n`)
  return () => listeners.delete(listener)
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
    const unsubscribe = subscribe((payload) => res.write(payload))
    req.on("close", unsubscribe)
    return
  }

  if (req.method === "POST" && url.pathname === "/api/start") {
    const body = JSON.parse(await readBody(req)) as { changelog?: unknown }
    const changelog = typeof body.changelog === "string" ? body.changelog.trim() : ""
    const result = await startRun(changelog)
    sendJson(res, result.status, result.body)
    return
  }

  if (req.method === "POST" && url.pathname === "/api/kill") {
    const result = killRun()
    sendJson(res, result.status, result.body)
    return
  }

  if (req.method === "POST" && url.pathname === "/api/resume") {
    const result = resumeRun()
    sendJson(res, result.status, result.body)
    return
  }

  sendJson(res, 404, { error: "Not found" })
}

function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status })
}

function distRoot(): string | null {
  const candidates = [join(projectRoot(), "dist"), join(appRoot, "dist"), join(process.cwd(), "dist")]
  return candidates.find((dir) => existsSync(dir)) ?? null
}

function safeFile(root: string, relative: string): string | null {
  const resolved = resolve(root, relative)
  if (resolved !== root && !resolved.startsWith(`${root}/`)) return null
  return resolved
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

async function serveStatic(pathname: string): Promise<Response> {
  const root = distRoot()
  if (!root) return new Response("Demo build is missing. Run bun run build.", { status: 500 })
  const relative = pathname.replace(/^\/+/, "")
  const requested = relative === "" || relative.endsWith("/") ? `${relative}index.html` : relative
  const filePath = safeFile(root, requested)
  if (filePath && isFile(filePath)) return new Response(Bun.file(filePath))
  if (requested.includes(".")) return new Response("Not found", { status: 404 })
  const indexPath = safeFile(root, "index.html")
  if (indexPath && isFile(indexPath)) return new Response(Bun.file(indexPath))
  return new Response("Not found", { status: 404 })
}

async function productionFetch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = stripMount(url.pathname)

  if (request.method === "GET" && pathname === "/api/state") return jsonResponse(200, publicState())

  if (request.method === "GET" && pathname === "/api/events") {
    const encoder = new TextEncoder()
    let unsubscribe = () => {}
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        unsubscribe = subscribe((payload) => {
          try {
            controller.enqueue(encoder.encode(payload))
          } catch {
            unsubscribe()
          }
        })
        request.signal.addEventListener("abort", () => unsubscribe())
      },
      cancel() {
        unsubscribe()
      },
    })
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    })
  }

  if (pathname.startsWith("/api") && request.method === "POST") {
    try {
      if (pathname === "/api/start") {
        const body = (await request.json()) as { changelog?: unknown }
        const changelog = typeof body.changelog === "string" ? body.changelog.trim() : ""
        const result = await startRun(changelog)
        return jsonResponse(result.status, result.body)
      }
      if (pathname === "/api/kill") {
        const result = killRun()
        return jsonResponse(result.status, result.body)
      }
      if (pathname === "/api/resume") {
        const result = resumeRun()
        return jsonResponse(result.status, result.body)
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Request failed"
      return jsonResponse(500, { error: message })
    }
    return jsonResponse(404, { error: "Not found" })
  }

  if (pathname.startsWith("/api")) return jsonResponse(404, { error: "Not found" })
  return serveStatic(pathname)
}

if (hosted) {
  Bun.serve({
    port,
    hostname: "0.0.0.0",
    fetch: productionFetch,
  })
  const prefix = mountPrefix() || "/"
  console.log(`Pi Durable demo at http://127.0.0.1:${port}${prefix === "/" ? "" : prefix}`)
} else {
  const { createServer: createViteServer } = await import("vite")
  const hubOrigin = process.env.DEMO_HUB_ORIGIN
  const vite = await createViteServer({
    root: appRoot,
    server: {
      middlewareMode: true,
      hmr: hubOrigin ? { clientPort: Number(new URL(hubOrigin).port) } : undefined,
    },
    appType: "spa",
  })

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
    const pathname = stripMount(url.pathname)
    if (pathname.startsWith("/api")) {
      const routed = new URL(url)
      routed.pathname = pathname
      handleApi(req, res, routed).catch((caught: unknown) => {
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
    const prefix = mountPrefix()
    console.log(`Pi Durable demo at http://127.0.0.1:${port}${prefix}`)
  })
}
