import { OctagonX, Play, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { SAMPLE_CHANGELOG } from "../sample-changelog"
import type { PublicState, ToolCard, ToolStatus } from "../types"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Textarea } from "./ui/textarea"

const emptyState: PublicState = { phase: "idle", error: null, snapshot: null }

const phaseLabel: Record<PublicState["phase"], string> = {
  idle: "Idle",
  running: "Running",
  killed: "Killed",
  done: "Done",
  error: "Error",
}

const statusLabel: Record<ToolStatus, string> = {
  idle: "Waiting",
  running: "Running",
  replaying: "Replaying",
  completed: "Completed",
  replayed: "Replayed",
  interrupted: "Interrupted",
}

async function post(path: string, body?: unknown): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? "{}" : JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }
}

function ToolPanel({ tool }: { tool: ToolCard }) {
  const safe = tool.replay === "safe"
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-mono text-sm">{tool.name}</CardTitle>
          <Badge variant={safe ? "secondary" : "destructive"}>
            {safe ? "Replay-safe" : "Not replayable"}
          </Badge>
        </div>
        <CardDescription>{tool.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Status" value={statusLabel[tool.status]} />
          <Metric label="execute()" value={String(tool.executions)} />
          <Metric label="Publishes" value={String(tool.sideEffects)} />
        </div>
        <pre className="max-h-36 overflow-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs whitespace-pre-wrap">
          {tool.output || "No output yet."}
        </pre>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

export function DemoApp() {
  const [changelog, setChangelog] = useState(SAMPLE_CHANGELOG)
  const [state, setState] = useState<PublicState>(emptyState)
  const [pending, setPending] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const source = new EventSource("/api/events")
    source.onmessage = (event) => {
      setState(JSON.parse(event.data) as PublicState)
    }
    return () => source.close()
  }, [])

  const busy = pending !== null || state.phase === "running"
  const killed = state.phase === "killed"
  const tools = state.snapshot?.tools ?? []
  const scan = tools.find((tool) => tool.name === "scan_changelog")
  const stamp = tools.find((tool) => tool.name === "stamp_release")

  async function run(action: "start" | "kill" | "resume") {
    setPending(action)
    setFormError(null)
    try {
      if (action === "start") await post("/api/start", { changelog })
      if (action === "kill") await post("/api/kill")
      if (action === "resume") await post("/api/resume")
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Request failed")
    } finally {
      setPending(null)
    }
  }

  const banner =
    state.phase === "killed"
      ? "Worker killed. SQLite still has the last checkpoint. Restart to resume."
      : (state.snapshot?.hint ?? "Paste a changelog and start the mock agent.")

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Pi Durable
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Crash-proof release brief</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A mock model scans a changelog and stamps a release note. Kill the worker mid-run.
            Restart continues from the last SQLite checkpoint.
          </p>
        </div>
        <Badge variant="outline" aria-live="polite">
          {phaseLabel[state.phase]}
          {pending ? ` · ${pending}` : ""}
        </Badge>
      </header>

      <p
        className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground"
        aria-live="polite"
      >
        {state.error ?? formError ?? banner}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Changelog</CardTitle>
            <CardDescription>Mock mode. No API key. The faux model follows a fixed script.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="changelog">
              Pasted notes
              <Textarea
                id="changelog"
                className="min-h-48 font-mono text-xs"
                value={changelog}
                disabled={busy || killed}
                onChange={(event) => setChangelog(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || killed || changelog.trim().length === 0}
                onClick={() => run("start")}
              >
                <Play />
                Start run
              </Button>
              <Button
                variant="destructive"
                disabled={state.phase !== "running" || pending !== null}
                onClick={() => run("kill")}
              >
                <OctagonX />
                Kill agent
              </Button>
              <Button
                variant="outline"
                disabled={!killed || pending !== null}
                onClick={() => run("resume")}
              >
                <RotateCcw />
                Restart
              </Button>
              {killed ? (
                <Button
                  variant="ghost"
                  disabled={pending !== null}
                  onClick={() => run("start")}
                >
                  Start over
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkpoints</CardTitle>
            <CardDescription>Each row is a commit the next process can see.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid max-h-80 gap-2 overflow-auto">
              {(state.snapshot?.checkpoints ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">No checkpoints yet.</li>
              ) : (
                state.snapshot?.checkpoints.map((checkpoint) => (
                  <li
                    key={checkpoint.id}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{checkpoint.title}</span>
                      <Badge variant={checkpoint.state === "live" ? "default" : "outline"}>
                        {checkpoint.state}
                      </Badge>
                    </div>
                    {checkpoint.detail ? (
                      <p className="mt-1 text-xs text-muted-foreground">{checkpoint.detail}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {scan ? <ToolPanel tool={scan} /> : <ToolPanel tool={placeholder("scan_changelog")} />}
        {stamp ? <ToolPanel tool={stamp} /> : <ToolPanel tool={placeholder("stamp_release")} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release brief</CardTitle>
          <CardDescription>Written after both tool results are in the transcript.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="font-mono text-sm whitespace-pre-wrap">
            {state.snapshot?.brief || "The brief appears when the run settles."}
          </pre>
        </CardContent>
      </Card>
    </main>
  )
}

function placeholder(name: "scan_changelog" | "stamp_release"): ToolCard {
  const safe = name === "scan_changelog"
  return {
    name,
    replay: safe ? "safe" : "unsafe",
    blurb: safe
      ? "Reads the pasted changelog. An in-flight call runs again after a crash. A finished call stays finished."
      : "Records a publish, then keeps working. An in-flight call is reported as interrupted and is not run again.",
    status: "idle",
    executions: 0,
    sideEffects: 0,
    output: "",
  }
}
