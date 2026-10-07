import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createConcierge, type Concierge, type ThreadSnapshot } from "./mastra/concierge"
import { mountPrefix, stripMount } from "./mount"

const appRoot = fileURLToPath(new URL("..", import.meta.url))
const port = Number(process.env.PORT ?? 3000)
const hosted = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"

function projectRoot(): string {
  const candidates = [appRoot, process.cwd(), join(process.cwd(), "apps", "mastra-agent-demo")]
  return candidates.find((dir) => existsSync(join(dir, "node_modules"))) ?? appRoot
}

function knowledgeDir(): string {
  const root = projectRoot()
  const candidates = [
    join(root, "src/knowledge"),
    join(appRoot, "src/knowledge"),
    join(process.cwd(), "src/knowledge"),
    join(process.cwd(), "apps", "mastra-agent-demo", "src/knowledge"),
  ]
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0] ?? join(appRoot, "src/knowledge")
}

const dataDir = process.env.VERCEL === "1" ? "/tmp/mastra-agent-demo" : join(projectRoot(), "data")

let conciergePromise: Promise<Concierge> | null = null

function concierge(): Promise<Concierge> {
  conciergePromise ??= createConcierge({ dataDir, knowledgeDir: knowledgeDir() })
  return conciergePromise
}

const threadPattern = /^[A-Za-z0-9_-]{8,80}$/

function isThreadId(value: unknown): value is string {
  return typeof value === "string" && threadPattern.test(value)
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

function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status })
}

async function chat(threadId: string, text: string): Promise<ThreadSnapshot> {
  const agent = await concierge()
  await agent.ask(threadId, text)
  return agent.snapshot(threadId)
}

async function thread(threadId: string): Promise<ThreadSnapshot> {
  const agent = await concierge()
  return agent.snapshot(threadId)
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  if (req.method === "GET" && url.pathname === "/api/thread") {
    const threadId = url.searchParams.get("threadId")
    if (!isThreadId(threadId)) {
      sendJson(res, 400, { error: "Missing thread id." })
      return
    }
    sendJson(res, 200, await thread(threadId))
    return
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    const body = JSON.parse(await readBody(req)) as { threadId?: unknown; text?: unknown }
    const text = typeof body.text === "string" ? body.text.trim() : ""
    if (!isThreadId(body.threadId)) {
      sendJson(res, 400, { error: "Missing thread id." })
      return
    }
    if (!text || text.length > 4_000) {
      sendJson(res, 400, { error: "Write a message first." })
      return
    }
    sendJson(res, 200, await chat(body.threadId, text))
    return
  }

  sendJson(res, 404, { error: "Not found" })
}

function distRoot(): string | null {
  const candidates = [
    join(projectRoot(), "dist"),
    join(appRoot, "dist"),
    join(process.cwd(), "dist"),
    join(process.cwd(), "apps", "mastra-agent-demo", "dist"),
  ]
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

  try {
    if (request.method === "GET" && pathname === "/api/thread") {
      const threadId = url.searchParams.get("threadId")
      if (!isThreadId(threadId)) return jsonResponse(400, { error: "Missing thread id." })
      return jsonResponse(200, await thread(threadId))
    }
    if (request.method === "POST" && pathname === "/api/chat") {
      const body = (await request.json()) as { threadId?: unknown; text?: unknown }
      const text = typeof body.text === "string" ? body.text.trim() : ""
      if (!isThreadId(body.threadId)) return jsonResponse(400, { error: "Missing thread id." })
      if (!text || text.length > 4_000) return jsonResponse(400, { error: "Write a message first." })
      return jsonResponse(200, await chat(body.threadId, text))
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Request failed"
    return jsonResponse(500, { error: message })
  }

  if (pathname.startsWith("/api")) return jsonResponse(404, { error: "Not found" })
  return serveStatic(pathname)
}

if (hosted) {
  Bun.serve({
    ...(process.env.VERCEL === "1" ? {} : { port, hostname: "0.0.0.0" }),
    fetch: productionFetch,
  })
  const prefix = mountPrefix() || "/"
  console.log(`Mastra concierge at http://127.0.0.1:${port}${prefix === "/" ? "" : prefix}`)
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
    console.log(`Mastra concierge at http://127.0.0.1:${port}${prefix}`)
  })
}
